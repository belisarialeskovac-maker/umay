
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isToday, isThisMonth } from "date-fns"
import { CalendarIcon, Edit, Save, X, Loader2, MoreHorizontal, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { useData } from "@/context/data-context"
import withAuth from "@/components/with-auth"
import type { Agent, DailyAddedClient, Client, Transaction, Absence, Penalty, Reward } from "@/context/data-context"

type TeamPerformanceData = {
    agentName: string;
    addedToday: number;
    monthlyAdded: number;
    openAccounts: number;
    totalDeposits: number;
    totalWithdrawals: number;
    lastEditedBy: string;
    editor?: string;
};

const absenceSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  agent: z.string().min(1, "Agent name is required."),
  remarks: z.string().min(1, "Remarks are required."),
})

const penaltySchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  agent: z.string().min(1, "Agent name is required."),
  remarks: z.string().min(1, "Remarks are required."),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
})

const rewardSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  agent: z.string().min(1, "Agent name is required."),
  remarks: z.string().min(1, "Remarks are required."),
  status: z.enum(["Claimed", "Unclaimed"]),
})

function TeamPerformancePage() {
  const { user, loading: authLoading } = useAuth();
  const { agents, teamPerformance: teamPerformanceDocs, absences, penalties, rewards, loading: dataLoading, dailyAddedClients, clients, deposits, withdrawals } = useData();
  
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<TeamPerformanceData>>({});

  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false)
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false)
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false)
  
  // Edit/Delete/Selection States
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deletingAbsence, setDeletingAbsence] = useState<Absence | null>(null);
  const [selectedAbsences, setSelectedAbsences] = useState<string[]>([]);
  
  const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
  const [deletingPenalty, setDeletingPenalty] = useState<Penalty | null>(null);
  const [selectedPenalties, setSelectedPenalties] = useState<string[]>([]);
  
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [deletingReward, setDeletingReward] = useState<Reward | null>(null);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  
  const [bulkDeleteType, setBulkDeleteType] = useState<'absences' | 'penalties' | 'rewards' | null>(null);

  const { toast } = useToast()

  const absenceForm = useForm<z.infer<typeof absenceSchema>>({ resolver: zodResolver(absenceSchema), defaultValues: { date: new Date() } })
  const penaltyForm = useForm<z.infer<typeof penaltySchema>>({ resolver: zodResolver(penaltySchema), defaultValues: { date: new Date(), amount: 0 } })
  const rewardForm = useForm<z.infer<typeof rewardSchema>>({ resolver: zodResolver(rewardSchema), defaultValues: { date: new Date(), status: "Unclaimed"} })
  
  const absenceEditForm = useForm<z.infer<typeof absenceSchema>>({ resolver: zodResolver(absenceSchema) })
  const penaltyEditForm = useForm<z.infer<typeof penaltySchema>>({ resolver: zodResolver(penaltySchema) })
  const rewardEditForm = useForm<z.infer<typeof rewardSchema>>({ resolver: zodResolver(rewardSchema) })

  const displayAgents = useMemo(() => agents.filter(agent => agent.role !== 'Superadmin'), [agents]);

  const teamPerformance = useMemo(() => {
    return displayAgents.map(agent => {
      const systemMetrics = {
        addedToday: dailyAddedClients.filter(c => c.assignedAgent === agent.name && isToday(c.date)).length,
        monthlyAdded: dailyAddedClients.filter(c => c.assignedAgent === agent.name && isThisMonth(c.date)).length,
        openAccounts: clients.filter(c => c.agent === agent.name && isThisMonth(c.kycCompletedDate)).length,
        totalDeposits: deposits.filter(d => d.agent === agent.name && isThisMonth(d.date)).reduce((sum, d) => sum + d.amount, 0),
        totalWithdrawals: withdrawals.filter(w => w.agent === agent.name && isThisMonth(w.date)).reduce((sum, w) => sum + w.amount, 0),
      };

      const storedAgentData = teamPerformanceDocs[agent.name];
      const isEdited = storedAgentData && storedAgentData.lastEditedBy !== 'System';
            
      return {
        agentName: agent.name,
        addedToday: isEdited ? storedAgentData.addedToday : systemMetrics.addedToday,
        monthlyAdded: isEdited ? storedAgentData.monthlyAdded : systemMetrics.monthlyAdded,
        openAccounts: isEdited ? storedAgentData.openAccounts : systemMetrics.openAccounts,
        totalDeposits: isEdited ? storedAgentData.totalDeposits : systemMetrics.totalDeposits,
        totalWithdrawals: isEdited ? storedAgentData.totalWithdrawals : systemMetrics.totalWithdrawals,
        lastEditedBy: storedAgentData?.editor || "System",
      };
    });
  }, [displayAgents, dailyAddedClients, clients, deposits, withdrawals, teamPerformanceDocs]);
  
  // --- Generic handlers ---
  const handleSelect = useCallback((id: string, type: 'absences' | 'penalties' | 'rewards') => {
    const setters = {
        absences: setSelectedAbsences,
        penalties: setSelectedPenalties,
        rewards: setSelectedRewards
    };
    setters[type](prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleSelectAll = useCallback((checked: boolean, type: 'absences' | 'penalties' | 'rewards') => {
    const data = { absences, penalties, rewards };
    const setters = { absences: setSelectedAbsences, penalties: setSelectedPenalties, rewards: setSelectedRewards };
    setters[type](checked ? data[type].map(item => item.id) : []);
  }, [absences, penalties, rewards]);

  const handleBulkDelete = useCallback(async () => {
    if (!bulkDeleteType) return;
    const collections = { absences: 'absences', penalties: 'penalties', rewards: 'rewards' };
    const selectedIds = { absences: selectedAbsences, penalties: selectedPenalties, rewards: selectedRewards };
    const setters = { absences: setSelectedAbsences, penalties: setSelectedPenalties, rewards: setSelectedRewards };
    
    const collectionName = collections[bulkDeleteType];
    const idsToDelete = selectedIds[bulkDeleteType];

    const batch = writeBatch(db);
    idsToDelete.forEach(id => batch.delete(doc(db, collectionName, id)));
    try {
        await batch.commit();
        toast({ title: 'Records Deleted', description: `${idsToDelete.length} records have been deleted.` });
        setters[bulkDeleteType]([]);
    } catch(err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to delete records.', variant: 'destructive'});
    }
    setBulkDeleteType(null);
  }, [bulkDeleteType, selectedAbsences, selectedPenalties, selectedRewards, toast]);


  // --- Create handlers ---
  const onAbsenceSubmit = useCallback(async (values: z.infer<typeof absenceSchema>) => {
    await addDoc(collection(db, "absences"), values);
    toast({ title: "Absence Recorded", description: `Absence for ${values.agent} has been recorded.` })
    setAbsenceDialogOpen(false)
    absenceForm.reset({agent: '', remarks: '', date: new Date()})
  }, [toast, absenceForm]);

  const onPenaltySubmit = useCallback(async (values: z.infer<typeof penaltySchema>) => {
    await addDoc(collection(db, "penalties"), values);
    toast({ title: "Penalty Recorded", description: `Penalty for ${values.agent} has been recorded.` })
    setPenaltyDialogOpen(false)
    penaltyForm.reset({agent: '', remarks: '', amount: 0, date: new Date()})
  }, [toast, penaltyForm]);

  const onRewardSubmit = useCallback(async (values: z.infer<typeof rewardSchema>) => {
    await addDoc(collection(db, "rewards"), values);
    toast({ title: "Reward Recorded", description: `Reward for ${values.agent} has been recorded.` })
    setRewardDialogOpen(false)
    rewardForm.reset({agent: '', remarks: '', status: 'Unclaimed', date: new Date()})
  }, [toast, rewardForm]);
  
  // --- Update Handlers ---
  const onAbsenceEditSubmit = useCallback(async (values: z.infer<typeof absenceSchema>) => {
    if(!editingAbsence) return;
    await updateDoc(doc(db, 'absences', editingAbsence.id), values);
    toast({ title: "Absence Updated", description: "Absence record has been updated." });
    setEditingAbsence(null);
  }, [editingAbsence, toast]);
  
  const onPenaltyEditSubmit = useCallback(async (values: z.infer<typeof penaltySchema>) => {
    if(!editingPenalty) return;
    await updateDoc(doc(db, 'penalties', editingPenalty.id), values);
    toast({ title: "Penalty Updated", description: "Penalty record has been updated." });
    setEditingPenalty(null);
  }, [editingPenalty, toast]);
  
  const onRewardEditSubmit = useCallback(async (values: z.infer<typeof rewardSchema>) => {
    if(!editingReward) return;
    await updateDoc(doc(db, 'rewards', editingReward.id), values);
    toast({ title: "Reward Updated", description: "Reward record has been updated." });
    setEditingReward(null);
  }, [editingReward, toast]);
  
  // --- Delete Handlers ---
  const handleDeleteAbsence = useCallback(async () => {
    if(!deletingAbsence) return;
    await deleteDoc(doc(db, 'absences', deletingAbsence.id));
    toast({ title: 'Absence Deleted', description: 'Absence record has been removed.', variant: 'destructive'});
    setDeletingAbsence(null);
  }, [deletingAbsence, toast]);

  const handleDeletePenalty = useCallback(async () => {
    if(!deletingPenalty) return;
    await deleteDoc(doc(db, 'penalties', deletingPenalty.id));
    toast({ title: 'Penalty Deleted', description: 'Penalty record has been removed.', variant: 'destructive'});
    setDeletingPenalty(null);
  }, [deletingPenalty, toast]);
  
  const handleDeleteReward = useCallback(async () => {
    if(!deletingReward) return;
    await deleteDoc(doc(db, 'rewards', deletingReward.id));
    toast({ title: 'Reward Deleted', description: 'Reward record has been removed.', variant: 'destructive'});
    setDeletingReward(null);
  }, [deletingReward, toast]);

  const handleEdit = useCallback((agentName: string) => {
    setEditingAgent(agentName);
    const agentData = teamPerformance.find(p => p.agentName === agentName);
    if(agentData) {
        setEditedData(agentData);
    }
  }, [teamPerformance]);

  const handleCancelEdit = useCallback(() => {
    setEditingAgent(null);
    setEditedData({});
  }, []);
  
  const handleSave = useCallback(async (agentName: string) => {
    if (!user) return;
    const perfDocRef = doc(db, 'teamPerformance', agentName);
    const dataToSave = { 
        ...teamPerformance.find(p => p.agentName === agentName), 
        ...editedData, 
        lastEditedBy: 'Admin',
        editor: user.name,
    };
    await setDoc(perfDocRef, dataToSave, { merge: true });
    
    setEditingAgent(null);
    setEditedData({});
    toast({ title: "Performance Updated", description: `Data for ${agentName} has been saved.` });
  }, [user, toast, editedData, teamPerformance]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, field: keyof TeamPerformanceData) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setEditedData(prev => ({...prev, [field]: value}));
  }, []);
  
  if (dataLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track your team's absences, penalties, and rewards.
          </p>
        </div>
      </div>
      <Tabs defaultValue="team">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="absences">Absences</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-4">
             {teamPerformance.length > 0 ? (
                <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Added Today</TableHead>
                        <TableHead>Monthly Added</TableHead>
                        <TableHead>Open Accounts</TableHead>
                        <TableHead>Total Deposits</TableHead>
                        <TableHead>Total Withdrawals</TableHead>
                        <TableHead>Last Edited By</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {teamPerformance.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{item.agentName}</TableCell>
                            <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.addedToday ?? ''} onChange={e => handleInputChange(e, 'addedToday')} className="w-24" />
                                ) : item.addedToday}
                            </TableCell>
                             <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.monthlyAdded ?? ''} onChange={e => handleInputChange(e, 'monthlyAdded')} className="w-24" />
                                ) : item.monthlyAdded}
                            </TableCell>
                            <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.openAccounts ?? ''} onChange={e => handleInputChange(e, 'openAccounts')} className="w-24" />
                                ) : item.openAccounts}
                            </TableCell>
                            <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.totalDeposits ?? ''} onChange={e => handleInputChange(e, 'totalDeposits')} className="w-32" />
                                ) : `$${item.totalDeposits.toFixed(2)}`}
                            </TableCell>
                             <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.totalWithdrawals ?? ''} onChange={e => handleInputChange(e, 'totalWithdrawals')} className="w-32" />
                                ) : `$${item.totalWithdrawals.toFixed(2)}`}
                            </TableCell>
                            <TableCell>{item.lastEditedBy}</TableCell>
                            <TableCell>
                                {editingAgent === item.agentName ? (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => handleSave(item.agentName)}><Save className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => handleEdit(item.agentName)}><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">No Team Data Available</h2>
                    <p className="text-muted-foreground mt-2">Register agents and add client data to see performance metrics.</p>
                </div>
                </div>
            )}
        </TabsContent>
        <TabsContent value="absences">
          <div className="flex justify-between items-center my-4">
            {selectedAbsences.length > 0 ? (
                <Button variant="destructive" onClick={() => setBulkDeleteType('absences')}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedAbsences.length})
                </Button>
            ) : <div />}
            <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Absence</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Absence</DialogTitle></DialogHeader>
                <Form {...absenceForm}>
                  <form onSubmit={absenceForm.handleSubmit(onAbsenceSubmit)} className="space-y-4">
                    <FormField control={absenceForm.control} name="agent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                          <SelectContent>{displayAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={absenceForm.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={absenceForm.control} name="remarks" render={({ field }) => (
                      <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Enter remarks..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter><Button type="submit">Add</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {absences.length > 0 ? (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Checkbox onCheckedChange={checked => handleSelectAll(Boolean(checked), 'absences')} checked={selectedAbsences.length === absences.length && absences.length > 0} /></TableHead>
                    <TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Remarks</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((item) => (
                    <TableRow key={item.id} data-state={selectedAbsences.includes(item.id) && "selected"}>
                      <TableCell><Checkbox onCheckedChange={checked => handleSelect(item.id, 'absences')} checked={selectedAbsences.includes(item.id)} /></TableCell>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingAbsence(item); absenceEditForm.reset(item); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletingAbsence(item)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
              <div className="text-center"><h2 className="text-2xl font-bold tracking-tight text-foreground">No Absences Recorded</h2><p className="text-muted-foreground mt-2">Absence data will appear here.</p></div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="penalties">
        <div className="flex justify-between items-center my-4">
            {selectedPenalties.length > 0 ? (
                <Button variant="destructive" onClick={() => setBulkDeleteType('penalties')}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedPenalties.length})
                </Button>
            ) : <div />}
            <Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
              <DialogTrigger asChild><Button>Add Penalty</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Penalty</DialogTitle></DialogHeader>
                <Form {...penaltyForm}>
                  <form onSubmit={penaltyForm.handleSubmit(onPenaltySubmit)} className="space-y-4">
                  <FormField control={penaltyForm.control} name="agent" render={({ field }) => (
                      <FormItem><FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                          <SelectContent>{displayAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={penaltyForm.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={penaltyForm.control} name="remarks" render={({ field }) => (
                      <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Enter remarks..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={penaltyForm.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter><Button type="submit">Add</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        {penalties.length > 0 ? (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Checkbox onCheckedChange={checked => handleSelectAll(Boolean(checked), 'penalties')} checked={selectedPenalties.length === penalties.length && penalties.length > 0} /></TableHead>
                    <TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Remarks</TableHead><TableHead>Amount</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penalties.map((item) => (
                    <TableRow key={item.id} data-state={selectedPenalties.includes(item.id) && "selected"}>
                      <TableCell><Checkbox onCheckedChange={checked => handleSelect(item.id, 'penalties')} checked={selectedPenalties.includes(item.id)} /></TableCell>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell>${item.amount.toFixed(2)}</TableCell>
                       <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingPenalty(item); penaltyEditForm.reset(item); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletingPenalty(item)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
              <div className="text-center"><h2 className="text-2xl font-bold tracking-tight text-foreground">No Penalties Recorded</h2><p className="text-muted-foreground mt-2">Penalty data will appear here.</p></div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="rewards">
          <div className="flex justify-between items-center my-4">
             {selectedRewards.length > 0 ? (
                <Button variant="destructive" onClick={() => setBulkDeleteType('rewards')}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedRewards.length})
                </Button>
            ) : <div />}
            <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
              <DialogTrigger asChild><Button>Add Reward</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Reward</DialogTitle></DialogHeader>
                <Form {...rewardForm}>
                  <form onSubmit={rewardForm.handleSubmit(onRewardSubmit)} className="space-y-4">
                  <FormField control={rewardForm.control} name="agent" render={({ field }) => (
                      <FormItem><FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                          <SelectContent>{displayAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={rewardForm.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={rewardForm.control} name="remarks" render={({ field }) => (
                      <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Enter remarks..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={rewardForm.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Claimed">Claimed</SelectItem><SelectItem value="Unclaimed">Unclaimed</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter><Button type="submit">Add</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        {rewards.length > 0 ? (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Checkbox onCheckedChange={checked => handleSelectAll(Boolean(checked), 'rewards')} checked={selectedRewards.length === rewards.length && rewards.length > 0} /></TableHead>
                    <TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Remarks</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((item) => (
                    <TableRow key={item.id} data-state={selectedRewards.includes(item.id) && "selected"}>
                      <TableCell><Checkbox onCheckedChange={checked => handleSelect(item.id, 'rewards')} checked={selectedRewards.includes(item.id)} /></TableCell>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell><Badge variant={item.status === 'Claimed' ? 'secondary' : 'default'}>{item.status}</Badge></TableCell>
                       <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingReward(item); rewardEditForm.reset(item); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletingReward(item)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
              <div className="text-center"><h2 className="text-2xl font-bold tracking-tight text-foreground">No Rewards Recorded</h2><p className="text-muted-foreground mt-2">Reward data will appear here.</p></div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Modals */}
        <Dialog open={!!editingAbsence} onOpenChange={(open) => !open && setEditingAbsence(null)}>
            <DialogContent>
            <DialogHeader><DialogTitle>Edit Absence</DialogTitle></DialogHeader>
            <Form {...absenceEditForm}><form onSubmit={absenceEditForm.handleSubmit(onAbsenceEditSubmit)} className="space-y-4">
                {/* Absence Form Fields */}
                <FormField control={absenceEditForm.control} name="agent" render={({ field }) => (<FormItem><FormLabel>Agent</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{displayAgents.map(a=><SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                <FormField control={absenceEditForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal",!field.value&&"text-muted-foreground")}>{field.value?format(field.value,"PPP"):<span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage/></FormItem>)} />
                <FormField control={absenceEditForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>)} />
                <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
            </form></Form>
            </DialogContent>
        </Dialog>

        <Dialog open={!!editingPenalty} onOpenChange={(open) => !open && setEditingPenalty(null)}>
            <DialogContent>
            <DialogHeader><DialogTitle>Edit Penalty</DialogTitle></DialogHeader>
            <Form {...penaltyEditForm}><form onSubmit={penaltyEditForm.handleSubmit(onPenaltyEditSubmit)} className="space-y-4">
                {/* Penalty Form Fields */}
                <FormField control={penaltyEditForm.control} name="agent" render={({ field }) => (<FormItem><FormLabel>Agent</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{displayAgents.map(a=><SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                <FormField control={penaltyEditForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal",!field.value&&"text-muted-foreground")}>{field.value?format(field.value,"PPP"):<span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage/></FormItem>)} />
                <FormField control={penaltyEditForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>)} />
                <FormField control={penaltyEditForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)} />
                <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
            </form></Form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={!!editingReward} onOpenChange={(open) => !open && setEditingReward(null)}>
            <DialogContent>
            <DialogHeader><DialogTitle>Edit Reward</DialogTitle></DialogHeader>
            <Form {...rewardEditForm}><form onSubmit={rewardEditForm.handleSubmit(onRewardEditSubmit)} className="space-y-4">
                {/* Reward Form Fields */}
                <FormField control={rewardEditForm.control} name="agent" render={({ field }) => (<FormItem><FormLabel>Agent</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{displayAgents.map(a=><SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                <FormField control={rewardEditForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal",!field.value&&"text-muted-foreground")}>{field.value?format(field.value,"PPP"):<span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage/></FormItem>)} />
                <FormField control={rewardEditForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>)} />
                <FormField control={rewardEditForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Claimed">Claimed</SelectItem><SelectItem value="Unclaimed">Unclaimed</SelectItem></SelectContent></Select><FormMessage/></FormItem>)} />
                <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
            </form></Form>
            </DialogContent>
        </Dialog>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!deletingAbsence} onOpenChange={(open) => !open && setDeletingAbsence(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Absence?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the absence record for {deletingAbsence?.agent}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAbsence}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletingPenalty} onOpenChange={(open) => !open && setDeletingPenalty(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Penalty?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the penalty record for {deletingPenalty?.agent}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePenalty}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletingReward} onOpenChange={(open) => !open && setDeletingReward(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Reward?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the reward record for {deletingReward?.agent}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteReward}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!bulkDeleteType} onOpenChange={(open) => !open && setBulkDeleteType(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Selected Records?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the selected records? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

    </div>
  )
}


export default withAuth(TeamPerformancePage, ['Admin', 'Superadmin']);
