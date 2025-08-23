
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isToday, isThisMonth } from "date-fns"
import { CalendarIcon, Edit, Save, X } from "lucide-react"

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

type Agent = {
  name: string;
  email: string;
  dateHired: Date;
  agentType: string;
}

type Client = {
    shopId: string;
    clientName: string;
    agent: string;
    kycCompletedDate: Date;
    status: "In Process" | "Active" | "Eliminated";
    clientDetails: string;
}

type DailyAddedClient = {
    name: string;
    age: number;
    location: string;
    work: string;
    assignedAgent: string;
    date: Date;
};

type Transaction = {
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

type Absence = z.infer<typeof absenceSchema>
type Penalty = z.infer<typeof penaltySchema>
type Reward = z.infer<typeof rewardSchema>

export default function TeamPerformancePage() {
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

  const absenceForm = useForm<Absence>({ resolver: zodResolver(absenceSchema) })
  const penaltyForm = useForm<Penalty>({ resolver: zodResolver(penaltySchema) })
  const rewardForm = useForm<Reward>({ resolver: zodResolver(rewardSchema) })

  const calculatePerformanceMetrics = useCallback((agents: Agent[]) => {
    const dailyAddedClients: DailyAddedClient[] = JSON.parse(localStorage.getItem('dailyAddedClients') || '[]').map((c: any) => ({ ...c, date: new Date(c.date) }));
    const clients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]').map((c: any) => ({ ...c, kycCompletedDate: new Date(c.kycCompletedDate) }));
    const deposits: Transaction[] = JSON.parse(localStorage.getItem('deposits') || '[]').map((d: any) => ({ ...d, date: new Date(d.date) }));
    const withdrawals: Transaction[] = JSON.parse(localStorage.getItem('withdrawals') || '[]').map((w: any) => ({ ...w, date: new Date(w.date) }));
    const storedPerformance: TeamPerformanceData[] = JSON.parse(localStorage.getItem('teamPerformance') || '[]');

    const performanceData = agents.map(agent => {
        const agentDailyAdded = dailyAddedClients.filter(c => c.assignedAgent === agent.name && isToday(c.date)).length;
        const agentMonthlyAdded = dailyAddedClients.filter(c => c.assignedAgent === agent.name && isThisMonth(c.date)).length;
        const agentOpenAccounts = clients.filter(c => c.agent === agent.name && isThisMonth(c.kycCompletedDate)).length;
        const agentDeposits = deposits.filter(d => d.agent === agent.name && isThisMonth(d.date)).reduce((sum, d) => sum + d.amount, 0);
        const agentWithdrawals = withdrawals.filter(w => w.agent === agent.name && isThisMonth(w.date)).reduce((sum, w) => sum + w.amount, 0);
        
        const storedAgentData = storedPerformance.find(p => p.agentName === agent.name);

        return {
            agentName: agent.name,
            addedToday: storedAgentData?.lastEditedBy !== 'System' ? storedAgentData.addedToday : agentDailyAdded,
            monthlyAdded: storedAgentData?.lastEditedBy !== 'System' ? storedAgentData.monthlyAdded : agentMonthlyAdded,
            openAccounts: storedAgentData?.lastEditedBy !== 'System' ? storedAgentData.openAccounts : agentOpenAccounts,
            totalDeposits: storedAgentData?.lastEditedBy !== 'System' ? storedAgentData.totalDeposits : agentDeposits,
            totalWithdrawals: storedAgentData?.lastEditedBy !== 'System' ? storedAgentData.totalWithdrawals : agentWithdrawals,
            lastEditedBy: storedAgentData?.lastEditedBy ?? "System",
        };
    });

    setTeamPerformance(performanceData);
  }, []);

  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      const parsedAgents: Agent[] = JSON.parse(storedAgents).map((agent: any) => ({
        ...agent,
        dateHired: new Date(agent.dateHired),
      }));
      setRegisteredAgents(parsedAgents);
      calculatePerformanceMetrics(parsedAgents);
    }
  }, [calculatePerformanceMetrics]);

  const onAbsenceSubmit = (values: Absence) => {
    setAbsences((prev) => [...prev, values])
    toast({ title: "Absence Recorded", description: `Absence for ${values.agent} has been recorded.` })
    setAbsenceDialogOpen(false)
    absenceForm.reset({agent: '', remarks: ''})
  }

  const onPenaltySubmit = (values: Penalty) => {
    setPenalties((prev) => [...prev, values])
    toast({ title: "Penalty Recorded", description: `Penalty for ${values.agent} has been recorded.` })
    setPenaltyDialogOpen(false)
    penaltyForm.reset({agent: '', remarks: '', amount: 0})
  }

  const onRewardSubmit = (values: Reward) => {
    setRewards((prev) => [...prev, values])
    toast({ title: "Reward Recorded", description: `Reward for ${values.agent} has been recorded.` })
    setRewardDialogOpen(false)
    rewardForm.reset({agent: '', remarks: '', status: 'Unclaimed'})
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
  
  const handleSave = (agentName: string) => {
    const updatedPerformance = teamPerformance.map(p => 
        p.agentName === agentName ? { ...p, ...editedData, lastEditedBy: 'Admin' } : p
    );
    setTeamPerformance(updatedPerformance);
    localStorage.setItem('teamPerformance', JSON.stringify(updatedPerformance));
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
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="absences">Absences</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="team">
             {teamPerformance.length > 0 ? (
                <div className="rounded-lg border bg-card mt-4">
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
                                    <Input type="number" value={editedData.addedToday} onChange={e => handleInputChange(e, 'addedToday')} className="w-24" />
                                ) : item.addedToday}
                            </TableCell>
                             <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.monthlyAdded} onChange={e => handleInputChange(e, 'monthlyAdded')} className="w-24" />
                                ) : item.monthlyAdded}
                            </TableCell>
                            <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.openAccounts} onChange={e => handleInputChange(e, 'openAccounts')} className="w-24" />
                                ) : item.openAccounts}
                            </TableCell>
                            <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.totalDeposits} onChange={e => handleInputChange(e, 'totalDeposits')} className="w-32" />
                                ) : `$${item.totalDeposits.toFixed(2)}`}
                            </TableCell>
                             <TableCell>
                                {editingAgent === item.agentName ? (
                                    <Input type="number" value={editedData.totalWithdrawals} onChange={e => handleInputChange(e, 'totalWithdrawals')} className="w-32" />
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
          <div className="flex justify-end mt-4">
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
                            {registeredAgents.map(agent => <SelectItem key={agent.name} value={agent.name}>{agent.name}</SelectItem>)}
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
            <div className="rounded-lg border bg-card mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(item.date, "PPP")}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">No Absences Recorded</h2>
                <p className="text-muted-foreground mt-2">Absence data will appear here.</p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="penalties">
        <div className="flex justify-end mt-4">
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
                            {registeredAgents.map(agent => <SelectItem key={agent.name} value={agent.name}>{agent.name}</SelectItem>)}
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
            <div className="rounded-lg border bg-card mt-4">
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
                  {penalties.map((item, index) => (
                    <TableRow key={index}>
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
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">No Penalties Recorded</h2>
                <p className="text-muted-foreground mt-2">Penalty data will appear here.</p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="rewards">
          <div className="flex justify-end mt-4">
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
                            {registeredAgents.map(agent => <SelectItem key={agent.name} value={agent.name}>{agent.name}</SelectItem>)}
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
            <div className="rounded-lg border bg-card mt-4">
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
                  {rewards.map((item, index) => (
                    <TableRow key={index}>
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
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
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

    