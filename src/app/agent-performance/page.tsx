
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"

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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const agentTypes = ["Regular", "Elite", "Spammer", "Model", "Team Leader"] as const

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  dateHired: z.date({
    required_error: "A date of hiring is required.",
  }),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
  agentType: z.enum(agentTypes),
})

type Agent = z.infer<typeof formSchema>

// Data types from other pages
type Client = {
    shopId: string;
    clientName: string;
    agent: string;
    kycCompletedDate: Date;
    status: "In Process" | "Active" | "Eliminated";
    clientDetails: string;
}
type Transaction = {
    shopId: string;
    clientName: string;
    agent: string;
    date: Date;
    amount: number;
    paymentMode: string;
}
type Inventory = {
    id: string;
    agent: string;
    imei: string;
    model: string;
    color: string;
    appleIdUsername?: string;
    appleIdPassword?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}
type Order = {
    id: number;
    agent: string;
    shopId: string;
    location: string;
    price: number;
    remarks: string;
    status: "Pending" | "Approved" | "Rejected";
}
type Absence = {
  date: Date;
  agent: string;
  remarks: string;
}
type Penalty = {
  date: Date;
  agent: string;
  remarks: string;
  amount: number;
}
type Reward = {
  date: Date;
  agent: string;
  remarks: string;
  status: "Claimed" | "Unclaimed"
}


export default function AgentPerformancePage() {
  const [open, setOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const { toast } = useToast()
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // States for agent-related data
  const [agentClients, setAgentClients] = useState<Client[]>([]);
  const [agentDeposits, setAgentDeposits] = useState<Transaction[]>([]);
  const [agentWithdrawals, setAgentWithdrawals] = useState<Transaction[]>([]);
  const [agentInventory, setAgentInventory] = useState<Inventory[]>([]);
  const [agentOrders, setAgentOrders] = useState<Order[]>([]);
  const [agentAbsences, setAgentAbsences] = useState<Absence[]>([]);
  const [agentPenalties, setAgentPenalties] = useState<Penalty[]>([]);
  const [agentRewards, setAgentRewards] = useState<Reward[]>([]);


  const form = useForm<Agent>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      const parsedAgents = JSON.parse(storedAgents).map((agent: any) => ({
        ...agent,
        dateHired: new Date(agent.dateHired),
      }));
      setAgents(parsedAgents);
    }
  }, []);
  
  useEffect(() => {
    if (selectedAgent) {
        // Load all data from localStorage and filter for the selected agent
        const allClients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]').map((c:any) => ({...c, kycCompletedDate: new Date(c.kycCompletedDate)}));
        const allDeposits: Transaction[] = JSON.parse(localStorage.getItem('deposits') || '[]').map((d:any) => ({...d, date: new Date(d.date)}));
        const allWithdrawals: Transaction[] = JSON.parse(localStorage.getItem('withdrawals') || '[]').map((w:any) => ({...w, date: new Date(w.date)}));
        const allInventory: Inventory[] = JSON.parse(localStorage.getItem('inventory') || '[]');
        const allOrders: Order[] = JSON.parse(localStorage.getItem('orders') || '[]');
        const allAbsences: Absence[] = JSON.parse(localStorage.getItem('absences') || '[]').map((a:any) => ({...a, date: new Date(a.date)}));
        const allPenalties: Penalty[] = JSON.parse(localStorage.getItem('penalties') || '[]').map((p:any) => ({...p, date: new Date(p.date)}));
        const allRewards: Reward[] = JSON.parse(localStorage.getItem('rewards') || '[]').map((r:any) => ({...r, date: new Date(r.date)}));

        setAgentClients(allClients.filter(c => c.agent === selectedAgent.name));
        setAgentDeposits(allDeposits.filter(d => d.agent === selectedAgent.name));
        setAgentWithdrawals(allWithdrawals.filter(w => w.agent === selectedAgent.name));
        setAgentInventory(allInventory.filter(i => i.agent === selectedAgent.name));
        setAgentOrders(allOrders.filter(o => o.agent === selectedAgent.name));
        setAgentAbsences(allAbsences.filter(a => a.agent === selectedAgent.name));
        setAgentPenalties(allPenalties.filter(p => p.agent === selectedAgent.name));
        setAgentRewards(allRewards.filter(r => r.agent === selectedAgent.name));
    }
  }, [selectedAgent]);


  function onSubmit(values: Agent) {
    const updatedAgents = [...agents, values]
    setAgents(updatedAgents)
    localStorage.setItem("agents", JSON.stringify(updatedAgents));
    toast({
      title: "Agent Registered",
      description: `Successfully registered ${values.name}.`,
    })
    setOpen(false)
    form.reset()
  }
  
  const handleRowClick = (agent: Agent) => {
    setSelectedAgent(agent);
  }

  const handleCloseDetails = () => {
    setSelectedAgent(null);
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agent Performance</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your agents. Click on an agent to view their details.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Register Agent</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Register New Agent</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new agent.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateHired"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date Hired</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {agentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Register</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedAgent ? (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Agent Details: {selectedAgent.name}</CardTitle>
                        <CardDescription>
                            Email: {selectedAgent.email} | Type: {selectedAgent.agentType} | Hired: {format(selectedAgent.dateHired, "PPP")}
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleCloseDetails}><X className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-7">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="clients">Clients</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="inventory">Inventory</TabsTrigger>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="discipline">Discipline</TabsTrigger>
                        <TabsTrigger value="rewards">Rewards</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="pt-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader><CardTitle>Clients</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{agentClients.length}</div></CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Total Deposits</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">${agentDeposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Total Withdrawals</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">${agentWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Devices Held</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{agentInventory.length}</div></CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="clients">
                        <Table>
                            <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client Name</TableHead><TableHead>KYC Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agentClients.length > 0 ? agentClients.map(c => (
                                    <TableRow key={c.shopId}><TableCell>{c.shopId}</TableCell><TableCell>{c.clientName}</TableCell><TableCell>{format(c.kycCompletedDate, "PPP")}</TableCell><TableCell><Badge variant={c.status === 'Active' ? 'default' : c.status === 'In Process' ? 'secondary' : 'destructive'}>{c.status}</Badge></TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No clients found for this agent.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="transactions">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="text-lg font-medium mb-2">Deposits</h3>
                                <Table>
                                     <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                                     <TableBody>
                                        {agentDeposits.length > 0 ? agentDeposits.map((d,i) => (
                                            <TableRow key={`dep-${i}`}><TableCell>{d.shopId}</TableCell><TableCell>{d.clientName}</TableCell><TableCell>{format(d.date, "PPP")}</TableCell><TableCell>${d.amount.toFixed(2)}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center">No deposits found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-2">Withdrawals</h3>
                                <Table>
                                     <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                                     <TableBody>
                                        {agentWithdrawals.length > 0 ? agentWithdrawals.map((w,i) => (
                                            <TableRow key={`wit-${i}`}><TableCell>{w.shopId}</TableCell><TableCell>{w.clientName}</TableCell><TableCell>{format(w.date, "PPP")}</TableCell><TableCell>${w.amount.toFixed(2)}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center">No withdrawals found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="inventory">
                         <Table>
                            <TableHeader><TableRow><TableHead>IMEI</TableHead><TableHead>Model</TableHead><TableHead>Color</TableHead><TableHead>Last Updated</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agentInventory.length > 0 ? agentInventory.map(d => (
                                    <TableRow key={d.id}><TableCell>{d.imei}</TableCell><TableCell>{d.model}</TableCell><TableCell>{d.color}</TableCell><TableCell>{format(new Date(d.updatedAt), "PPP p")}</TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No devices found for this agent.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="orders">
                         <Table>
                            <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Location</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agentOrders.length > 0 ? agentOrders.map(o => (
                                    <TableRow key={o.id}><TableCell>{o.shopId}</TableCell><TableCell>{o.location}</TableCell><TableCell>${o.price.toFixed(2)}</TableCell><TableCell><Badge variant={o.status === 'Approved' ? 'default' : o.status === 'Pending' ? 'secondary' : 'destructive'}>{o.status}</Badge></TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No orders found for this agent.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="discipline">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="text-lg font-medium mb-2">Absences</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {agentAbsences.length > 0 ? agentAbsences.map((a,i) => (
                                            <TableRow key={`abs-${i}`}><TableCell>{format(a.date, "PPP")}</TableCell><TableCell>{a.remarks}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={2} className="text-center">No absences found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-2">Penalties</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {agentPenalties.length > 0 ? agentPenalties.map((p,i) => (
                                            <TableRow key={`pen-${i}`}><TableCell>{format(p.date, "PPP")}</TableCell><TableCell>{p.remarks}</TableCell><TableCell>${p.amount.toFixed(2)}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={3} className="text-center">No penalties found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="rewards">
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agentRewards.length > 0 ? agentRewards.map((r,i) => (
                                    <TableRow key={`rew-${i}`}><TableCell>{format(r.date, "PPP")}</TableCell><TableCell>{r.remarks}</TableCell><TableCell><Badge variant={r.status === 'Claimed' ? 'secondary' : 'default'}>{r.status}</Badge></TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center">No rewards found for this agent.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      ) : agents.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date Hired</TableHead>
                <TableHead>Agent Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent, index) => (
                <TableRow key={index} onClick={() => handleRowClick(agent)} className="cursor-pointer">
                  <TableCell>{agent.name}</TableCell>
                  <TableCell>{agent.email}</TableCell>
                  <TableCell>{format(agent.dateHired, "PPP")}</TableCell>
                  <TableCell>{agent.agentType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              No Agents Registered
            </h2>
            <p className="text-muted-foreground mt-2">
              Register an agent to see their performance data here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

    