
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, X, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"

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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { app, db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, Timestamp, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/context/auth-context"
import withAuth from "@/components/with-auth"

const agentTypes = ["Regular", "Elite", "Spammer", "Model", "Team Leader"] as const
const roles = ["Agent", "Admin", "Superadmin"] as const;

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
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters.").optional(),
  agentType: z.enum(agentTypes),
  role: z.enum(roles).default("Agent"),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type AgentFormData = z.infer<typeof formSchema>
type Agent = Omit<AgentFormData, 'password' | 'confirmPassword'> & { id: string, uid: string }


type Client = {
    id: string;
    shopId: string;
    clientName: string;
    agent: string;
    kycCompletedDate: Date;
    status: "In Process" | "Active" | "Eliminated";
    clientDetails: string;
}
type Transaction = {
    id: string;
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
    id: string;
    agent: string;
    shopId: string;
    location: string;
    price: number;
    remarks: string;
    status: "Pending" | "Approved" | "Rejected";
}
type Absence = {
  id: string;
  date: Date;
  agent: string;
  remarks: string;
}
type Penalty = {
  id: string;
  date: Date;
  agent: string;
  remarks: string;
  amount: number;
}
type Reward = {
  id: string;
  date: Date;
  agent: string;
  remarks: string;
  status: "Claimed" | "Unclaimed"
}


function AgentPerformancePage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([])
  const { toast } = useToast()
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  const [agentClients, setAgentClients] = useState<Client[]>([]);
  const [agentDeposits, setAgentDeposits] = useState<Transaction[]>([]);
  const [agentWithdrawals, setAgentWithdrawals] = useState<Transaction[]>([]);
  const [agentInventory, setAgentInventory] = useState<Inventory[]>([]);
  const [agentOrders, setAgentOrders] = useState<Order[]>([]);
  const [agentAbsences, setAgentAbsences] = useState<Absence[]>([]);
  const [agentPenalties, setAgentPenalties] = useState<Penalty[]>([]);
  const [agentRewards, setAgentRewards] = useState<Reward[]>([]);
  const auth = getAuth(app);


  const form = useForm<AgentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })
  
  const editForm = useForm<AgentFormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const q = query(collection(db, "agents"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const agentsData: Agent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        agentsData.push({ 
          ...data, 
          id: doc.id,
          dateHired: (data.dateHired as Timestamp).toDate()
        } as Agent);
      });
      setAgents(agentsData);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (selectedAgent) {
        const collections = ["clients", "deposits", "withdrawals", "inventory", "orders", "absences", "penalties", "rewards"];
        const setters:any = {
            clients: setAgentClients,
            deposits: setAgentDeposits,
            withdrawals: setAgentWithdrawals,
            inventory: setAgentInventory,
            orders: setAgentOrders,
            absences: setAgentAbsences,
            penalties: setAgentPenalties,
            rewards: setAgentRewards
        };

        const unsubscribers = collections.map(col => {
            const q = query(collection(db, col), where("agent", "==", selectedAgent.name));
            return onSnapshot(q, (querySnapshot) => {
                const data: any[] = [];
                querySnapshot.forEach((doc) => {
                    const docData = doc.data();
                    const item: any = { id: doc.id, ...docData };
                    // Convert Timestamps to Dates
                    for(const key in item) {
                        if(item[key] instanceof Timestamp) {
                            item[key] = item[key].toDate();
                        }
                    }
                    data.push(item);
                });
                setters[col](data);
            });
        });
        
        return () => unsubscribers.forEach(unsub => unsub());
    }
  }, [selectedAgent]);


  async function onSubmit(values: AgentFormData) {
    if(!values.password) {
        form.setError("password", {type: 'manual', message: "Password is required for new agents."})
        return;
    }
    try {
      // NOTE: This creates a new user in Firebase Auth.
      // This is a simplified approach. In a real-world scenario, you would want to use a more secure method
      // like a Cloud Function to handle user creation, especially when creating users from an admin panel.
      // However, for the purpose of this prototype, creating the user on the client-side is acceptable.
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const { uid } = userCredential.user;

      if (!uid) {
        throw new Error("User creation failed.");
      }

      const agentData = {
        uid: uid,
        name: values.name,
        email: values.email,
        agentType: values.agentType,
        role: values.role,
        dateHired: values.dateHired,
      };

      await setDoc(doc(db, "agents", uid), agentData);
      
      toast({
        title: "Agent Registered",
        description: `Successfully registered ${values.name} with a login account.`,
      })
      setOpen(false)
      form.reset()
    } catch (error: any) {
      console.error("Error adding agent: ", error);
      toast({
        title: "Error",
        description: error.message || "Failed to register agent.",
        variant: "destructive"
      })
    }
  }

  async function onEditSubmit(values: AgentFormData) {
    if (!agentToEdit) return;
    try {
      const agentRef = doc(db, "agents", agentToEdit.uid);
      const { password, confirmPassword, ...agentData } = values;
      await updateDoc(agentRef, agentData as any); // Type assertion needed because updateDoc doesn't know about our refined schema
      toast({ title: "Agent Updated", description: "Agent details have been updated." });
      setEditOpen(false);
      editForm.reset();
    } catch(error: any) {
        toast({ title: "Error", description: error.message || "Failed to update agent.", variant: "destructive" });
    }
  }

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    try {
        // We need a flow to delete the user from Auth. For now, we only delete from Firestore.
        await deleteDoc(doc(db, "agents", agentToDelete.uid));
        toast({
            title: "Agent Deleted",
            description: `${agentToDelete.name} has been removed from the database.`,
            variant: "destructive"
        })
    } catch (error: any) {
         toast({ title: "Error", description: error.message || "Failed to delete agent.", variant: "destructive" });
    }
    setDeleteAlertOpen(false);
    setAgentToDelete(null);
  }

  const openEditDialog = (agent: Agent) => {
    setAgentToEdit(agent);
    editForm.reset({
        ...agent,
        dateHired: agent.dateHired
    });
    setEditOpen(true);
  }
  
  const openDeleteDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setDeleteAlertOpen(true);
  }
  
  const handleRowClick = (agent: Agent) => {
    setSelectedAgent(agent);
  }

  const handleCloseDetails = () => {
    setSelectedAgent(null);
  }
  
  const canRegisterAgent = user?.role === 'Admin' || user?.role === 'Superadmin';

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agent Performance</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your agents. Click on an agent to view their details.
          </p>
        </div>
        {canRegisterAgent && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Register Agent</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Register New Agent</DialogTitle>
                <DialogDescription>
                  Fill in the details below to add a new agent and create their login account.
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
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
                   <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role} disabled={user?.role !== 'Superadmin' && role === 'Superadmin'}>
                                {role}
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
        )}
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
                                    <TableRow key={c.id}><TableCell>{c.shopId}</TableCell><TableCell>{c.clientName}</TableCell><TableCell>{format(c.kycCompletedDate, "PPP")}</TableCell><TableCell><Badge variant={c.status === 'Active' ? 'default' : c.status === 'In Process' ? 'secondary' : 'destructive'}>{c.status}</Badge></TableCell></TableRow>
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
                                            <TableRow key={d.id}><TableCell>{d.shopId}</TableCell><TableCell>{d.clientName}</TableCell><TableCell>{format(d.date, "PPP")}</TableCell><TableCell>${d.amount.toFixed(2)}</TableCell></TableRow>
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
                                            <TableRow key={w.id}><TableCell>{w.shopId}</TableCell><TableCell>{w.clientName}</TableCell><TableCell>{format(w.date, "PPP")}</TableCell><TableCell>${w.amount.toFixed(2)}</TableCell></TableRow>
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
                                            <TableRow key={a.id}><TableCell>{format(a.date, "PPP")}</TableCell><TableCell>{a.remarks}</TableCell></TableRow>
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
                                            <TableRow key={p.id}><TableCell>{format(p.date, "PPP")}</TableCell><TableCell>{p.remarks}</TableCell><TableCell>${p.amount.toFixed(2)}</TableCell></TableRow>
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
                                    <TableRow key={r.id}><TableCell>{format(r.date, "PPP")}</TableCell><TableCell>{r.remarks}</TableCell><TableCell><Badge variant={r.status === 'Claimed' ? 'secondary' : 'default'}>{r.status}</Badge></TableCell></TableRow>
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
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell onClick={() => handleRowClick(agent)} className="cursor-pointer font-medium">{agent.name}</TableCell>
                  <TableCell onClick={() => handleRowClick(agent)} className="cursor-pointer">{agent.email}</TableCell>
                  <TableCell onClick={() => handleRowClick(agent)} className="cursor-pointer">{format(agent.dateHired, "PPP")}</TableCell>
                  <TableCell onClick={() => handleRowClick(agent)} className="cursor-pointer">{agent.agentType}</TableCell>
                   <TableCell onClick={() => handleRowClick(agent)} className="cursor-pointer"><Badge variant={agent.role === 'Superadmin' ? 'destructive' : agent.role === 'Admin' ? 'default' : 'secondary'}>{agent.role}</Badge></TableCell>
                   <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(agent)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteDialog(agent)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                   </TableCell>
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

    <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Agent</DialogTitle>
                <DialogDescription>
                    Update the details for {agentToEdit?.name}.
                </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                     <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="dateHired" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date Hired</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                        </Popover><FormMessage /></FormItem>
                     )} />
                    <FormField control={editForm.control} name="agentType" render={({ field }) => (
                        <FormItem><FormLabel>Agent Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{agentTypes.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                     )} />
                    <FormField control={editForm.control} name="role" render={({ field }) => (
                        <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{roles.map(r=><SelectItem key={r} value={r} disabled={user?.role !== 'Superadmin' && r === 'Superadmin'}>{r}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                     )} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>

    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the agent's account and all associated data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAgent}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  )
}


export default withAuth(AgentPerformancePage, ['Admin', 'Superadmin']);

    
    