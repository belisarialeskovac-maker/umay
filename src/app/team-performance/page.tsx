
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isToday, isThisMonth } from "date-fns"
import { CalendarIcon, Edit, Save, X } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, onSnapshot, query, doc, Timestamp, getDoc, setDoc, getDocs } from "firebase/firestore";

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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import withAuth from "@/components/with-auth"

type Agent = {
  id: string;
  name: string;
  email: string;
  dateHired: Date;
  agentType: string;
  role: string;
}

type Client = {
    id: string;
    shopId: string;
    clientName: string;
    agent: string;
    kycCompletedDate: Date;
    status: "In Process" | "Active" | "Eliminated";
    clientDetails: string;
}

type DailyAddedClient = {
    id: string;
    name: string;
    age: number;
    location: string;
    work: string;
    assignedAgent: string;
    date: Date;
};

type Transaction = {
    id: string;
    shopId: string;
    clientName: string;
    agent: string;
    date: Date;
    amount: number;
    paymentMode: string;
}

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

type Absence = z.infer<typeof absenceSchema> & { id: string }
type Penalty = z.infer<typeof penaltySchema> & { id: string }
type Reward = z.infer<typeof rewardSchema> & { id: string }

function TeamPerformancePage() {
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([])
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData[]>([])
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<TeamPerformanceData>>({});


  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false)
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false)
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false)
  
  const { toast } = useToast()

  const absenceForm = useForm<z.infer<typeof absenceSchema>>({ resolver: zodResolver(absenceSchema), defaultValues: { date: new Date() } })
  const penaltyForm = useForm<z.infer<typeof penaltySchema>>({ resolver: zodResolver(penaltySchema), defaultValues: { date: new Date(), amount: 0 } })
  const rewardForm = useForm<z.infer<typeof rewardSchema>>({ resolver: zodResolver(rewardSchema), defaultValues: { date: new Date(), status: "Unclaimed"} })


  const calculatePerformanceMetrics = useCallback(async (agents: Agent[], performanceDocs: {[key: string]: TeamPerformanceData}) => {
    try {
        const dailyAddedSnapshot = await getDocs(collection(db, 'dailyAddedClients'));
        const dailyAddedClients: DailyAddedClient[] = dailyAddedSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate() } as DailyAddedClient));

        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clients: Client[] = clientsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, kycCompletedDate: (doc.data().kycCompletedDate as Timestamp).toDate() } as Client));

        const depositsSnapshot = await getDocs(collection(db, 'deposits'));
        const deposits: Transaction[] = depositsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate() } as Transaction));
        
        const withdrawalsSnapshot = await getDocs(collection(db, 'withdrawals'));
        const withdrawals: Transaction[] = withdrawalsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate() } as Transaction));

        const performanceData = agents.map(agent => {
            const systemMetrics = {
                addedToday: dailyAddedClients.filter(c => c.assignedAgent === agent.name && isToday(c.date)).length,
                monthlyAdded: dailyAddedClients.filter(c => c.assignedAgent === agent.name && isThisMonth(c.date)).length,
                openAccounts: clients.filter(c => c.agent === agent.name && isThisMonth(c.kycCompletedDate)).length,
                totalDeposits: deposits.filter(d => d.agent === agent.name && isThisMonth(d.date)).reduce((sum, d) => sum + d.amount, 0),
                totalWithdrawals: withdrawals.filter(w => w.agent === agent.name && isThisMonth(w.date)).reduce((sum, w) => sum + w.amount, 0),
            };

            const storedAgentData = performanceDocs[agent.name];
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

        setTeamPerformance(performanceData);
    } catch (error) {
        console.error("Error calculating performance metrics:", error);
        toast({ title: "Error", description: "Could not calculate team performance.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, "agents"), (agentSnapshot) => {
      const parsedAgents: Agent[] = agentSnapshot.docs.map(doc => ({...doc.data(), id: doc.id, dateHired: (doc.data().dateHired as Timestamp).toDate()} as Agent));
      setRegisteredAgents(parsedAgents);
      
      const unsubPerformance = onSnapshot(collection(db, 'teamPerformance'), (perfSnapshot) => {
        const perfDocs: {[key: string]: TeamPerformanceData} = {};
        perfSnapshot.forEach(doc => {
            perfDocs[doc.id] = doc.data() as TeamPerformanceData;
        });
        calculatePerformanceMetrics(parsedAgents, perfDocs);
      });

      return () => unsubPerformance();
    });
    
    const unsubAbsences = onSnapshot(collection(db, "absences"), (s) => setAbsences(s.docs.map(d => ({...d.data(), id: d.id, date: (d.data().date as Timestamp).toDate()} as Absence))));
    const unsubPenalties = onSnapshot(collection(db, "penalties"), (s) => setPenalties(s.docs.map(d => ({...d.data(), id: d.id, date: (d.data().date as Timestamp).toDate()} as Penalty))));
    const unsubRewards = onSnapshot(collection(db, "rewards"), (s) => setRewards(s.docs.map(d => ({...d.data(), id: d.id, date: (d.data().date as Timestamp).toDate()} as Reward))));

    return () => {
        unsubAgents();
        unsubAbsences();
        unsubPenalties();
        unsubRewards();
    }
  }, [calculatePerformanceMetrics]);

  const onAbsenceSubmit = async (values: z.infer<typeof absenceSchema>) => {
    await addDoc(collection(db, "absences"), values);
    toast({ title: "Absence Recorded", description: `Absence for ${values.agent} has been recorded.` })
    setAbsenceDialogOpen(false)
    absenceForm.reset({agent: '', remarks: '', date: new Date()})
  }

  const onPenaltySubmit = async (values: z.infer<typeof penaltySchema>) => {
    await addDoc(collection(db, "penalties"), values);
    toast({ title: "Penalty Recorded", description: `Penalty for ${values.agent} has been recorded.` })
    setPenaltyDialogOpen(false)
    penaltyForm.reset({agent: '', remarks: '', amount: 0, date: new Date()})
  }

  const onRewardSubmit = async (values: z.infer<typeof rewardSchema>) => {
    await addDoc(collection(db, "rewards"), values);
    toast({ title: "Reward Recorded", description: `Reward for ${values.agent} has been recorded.` })
    setRewardDialogOpen(false)
    rewardForm.reset({agent: '', remarks: '', status: 'Unclaimed', date: new Date()})
  }

  const handleEdit = (agentName: string) => {
    setEditingAgent(agentName);
    const agentData = teamPerformance.find(p => p.agentName === agentName);
    if(agentData) {
        setEditedData(agentData);
    }
  }

  const handleCancelEdit = () => {
    setEditingAgent(null);
    setEditedData({});
  }
  
  const handleSave = async (agentName: string) => {
    if (!user) return;
    const perfDocRef = doc(db, 'teamPerformance', agentName);
    const dataToSave = { 
        ...teamPerformance.find(p => p.agentName === agentName), 
        ...editedData, 
        lastEditedBy: 'Admin', // Keep this field for historical reference if needed
        editor: user.name, // Add an editor field
    };
    await setDoc(perfDocRef, dataToSave, { merge: true });
    
    setEditingAgent(null);
    setEditedData({});
    toast({ title: "Performance Updated", description: `Data for ${agentName} has been saved.` });
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof TeamPerformanceData) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setEditedData(prev => ({...prev, [field]: value}));
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
          <div className="flex justify-end my-4">
            <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Absence</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Absence</DialogTitle>
                </DialogHeader>
                <Form {...absenceForm}>
                  <form onSubmit={absenceForm.handleSubmit(onAbsenceSubmit)} className="space-y-4">
                    <FormField control={absenceForm.control} name="agent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {registeredAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={absenceForm.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={absenceForm.control} name="remarks" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter remarks..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit">Add</Button>
                    </DialogFooter>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">No Absences Recorded</h2>
                <p className="text-muted-foreground mt-2">Absence data will appear here.</p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="penalties">
        <div className="flex justify-end my-4">
            <Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Penalty</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Penalty</DialogTitle>
                </DialogHeader>
                <Form {...penaltyForm}>
                  <form onSubmit={penaltyForm.handleSubmit(onPenaltySubmit)} className="space-y-4">
                  <FormField control={penaltyForm.control} name="agent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {registeredAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={penaltyForm.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={penaltyForm.control} name="remarks" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter remarks..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={penaltyForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit">Add</Button>
                    </DialogFooter>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penalties.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell>${item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">No Penalties Recorded</h2>
                <p className="text-muted-foreground mt-2">Penalty data will appear here.</p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="rewards">
          <div className="flex justify-end my-4">
            <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Reward</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Reward</DialogTitle>
                </DialogHeader>
                <Form {...rewardForm}>
                  <form onSubmit={rewardForm.handleSubmit(onRewardSubmit)} className="space-y-4">
                  <FormField control={rewardForm.control} name="agent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {registeredAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={rewardForm.control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={rewardForm.control} name="remarks" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter remarks..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={rewardForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Claimed">Claimed</SelectItem>
                            <SelectItem value="Unclaimed">Unclaimed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit">Add</Button>
                    </DialogFooter>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Claimed' ? 'secondary' : 'default'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">No Rewards Recorded</h2>
                <p className="text-muted-foreground mt-2">Reward data will appear here.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}


export default withAuth(TeamPerformancePage, ['Admin', 'Superadmin']);

    