
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Loader2, FileText, Video, Boxes, ClipboardList, User, Banknote, Users, Activity, ShoppingCart, ShieldAlert, Award, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/auth-context"
import { useData } from "@/context/data-context"
import withAuth from "@/components/with-auth"
import type { Client, Transaction, Inventory, Order, Absence, Penalty, Reward } from "@/context/data-context"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


const locations = [
  "Albania", "Argentina", "Australia", "Canada", "France", "Germany", "Italy", "Japan",
  "Malaysia", "Netherlands", "Philippines", "Russia", "Singapore", "South Korea",
  "Spain", "Switzerland", "Thailand", "Turkey", "United Arab Emirates",
  "United Kingdom", "United States", "Vietnam", "China"
];

const orderFormSchema = z.object({
  shopId: z.string().min(1, "A shop ID is required."),
  location: z.string().min(1, "Location is required."),
  price: z.coerce.number().positive("Price must be a positive number."),
  remarks: z.string(),
})

const ITEMS_PER_PAGE = 10;

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { 
    clients, 
    deposits, 
    withdrawals, 
    inventory, 
    orders, 
    absences, 
    penalties, 
    rewards,
    loading: dataLoading 
  } = useData();

  const [agentClients, setAgentClients] = useState<Client[]>([]);
  const [agentDeposits, setAgentDeposits] = useState<Transaction[]>([]);
  const [agentWithdrawals, setAgentWithdrawals] = useState<Transaction[]>([]);
  const [agentInventory, setAgentInventory] = useState<Inventory[]>([]);
  const [agentOrders, setAgentOrders] = useState<Order[]>([]);
  const [agentAbsences, setAgentAbsences] = useState<Absence[]>([]);
  const [agentPenalties, setAgentPenalties] = useState<Penalty[]>([]);
  const [agentRewards, setAgentRewards] = useState<Reward[]>([]);
  
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const { toast } = useToast();

  const orderForm = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      shopId: "",
      location: "",
      price: 0,
      remarks: "",
    },
  })

  // Pagination states
  const [clientsPage, setClientsPage] = useState(1);
  const [depositsPage, setDepositsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [absencesPage, setAbsencesPage] = useState(1);
  const [penaltiesPage, setPenaltiesPage] = useState(1);
  const [rewardsPage, setRewardsPage] = useState(1);

  async function onOrderSubmit(values: z.infer<typeof orderFormSchema>) {
    if(!user) return;
    const newOrder = {
        ...values,
        agent: user.name,
        status: 'Pending',
    }
    try {
      await addDoc(collection(db, "orders"), newOrder);
      toast({
        title: "Order Requested",
        description: `Successfully requested order for Shop ID ${values.shopId}. Admin will be notified.`,
      })
      setOrderDialogOpen(false)
      orderForm.reset()
    } catch (error) {
      console.error("Error adding order: ", error);
      toast({
        title: "Error",
        description: "Failed to request order.",
        variant: "destructive"
      });
    }
  }

  useEffect(() => {
    if (user && !dataLoading) {
        const filterByName = (collection: any[]) => collection.filter(item => item.agent === user.name || item.assignedAgent === user.name);
        setAgentClients(filterByName(clients));
        setAgentDeposits(filterByName(deposits));
        setAgentWithdrawals(filterByName(withdrawals));
        setAgentInventory(filterByName(inventory));
        setAgentOrders(filterByName(orders));
        setAgentAbsences(filterByName(absences));
        setAgentPenalties(filterByName(penalties));
        setAgentRewards(filterByName(rewards));
    }
  }, [user, clients, deposits, withdrawals, inventory, orders, absences, penalties, rewards, dataLoading]);
  
  const paginate = (items: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };
  
  const renderPaginationControls = (
    totalPages: number,
    currentPage: number,
    setCurrentPage: (page: number) => void
  ) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
            >
                Previous
            </Button>
             <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next
            </Button>
        </div>
    );
  };
  
  const paginatedClients = paginate(agentClients, clientsPage);
  const clientsTotalPages = Math.ceil(agentClients.length / ITEMS_PER_PAGE);
  
  const paginatedDeposits = paginate(agentDeposits, depositsPage);
  const depositsTotalPages = Math.ceil(agentDeposits.length / ITEMS_PER_PAGE);
  
  const paginatedWithdrawals = paginate(agentWithdrawals, withdrawalsPage);
  const withdrawalsTotalPages = Math.ceil(agentWithdrawals.length / ITEMS_PER_PAGE);
  
  const paginatedInventory = paginate(agentInventory, inventoryPage);
  const inventoryTotalPages = Math.ceil(agentInventory.length / ITEMS_PER_PAGE);
  
  const paginatedOrders = paginate(agentOrders, ordersPage);
  const ordersTotalPages = Math.ceil(agentOrders.length / ITEMS_PER_PAGE);
  
  const paginatedAbsences = paginate(agentAbsences, absencesPage);
  const absencesTotalPages = Math.ceil(agentAbsences.length / ITEMS_PER_PAGE);

  const paginatedPenalties = paginate(agentPenalties, penaltiesPage);
  const penaltiesTotalPages = Math.ceil(agentPenalties.length / ITEMS_PER_PAGE);

  const paginatedRewards = paginate(agentRewards, rewardsPage);
  const rewardsTotalPages = Math.ceil(agentRewards.length / ITEMS_PER_PAGE);


  if (authLoading || dataLoading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }
  
  const userInitials = user.name?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">
            View your personal records and performance metrics.
            </p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 mb-4 border-2 border-primary/20">
                        <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="person" />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <div className="flex justify-between"><span className="font-semibold text-foreground">Role:</span> <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">{user.role}</Badge></div>
                        <div className="flex justify-between"><span className="font-semibold text-foreground">Type:</span> <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">{user.agentType}</Badge></div>
                        <div className="flex justify-between"><span className="font-semibold text-foreground">Hired:</span> <span>{format(user.dateHired, "PPP")}</span></div>
                        <div className="flex justify-between"><span className="font-semibold text-foreground">Status:</span> <Badge variant={user.status === 'Active' ? 'default' : 'destructive'}>{user.status}</Badge></div>
                    </div>
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>Quick links to common tasks.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button asChild variant="outline" className="justify-start">
                        <Link href="/inventory"><Boxes className="mr-2 h-4 w-4" /> My Inventory</Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                        <Link href="/reporting"><FileText className="mr-2 h-4 w-4" /> Create Daily Report</Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                        <Link href="/videocall-template"><Video className="mr-2 h-4 w-4" /> Videocall Template</Link>
                    </Button>
                    <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" className="justify-start"><ClipboardList className="mr-2 h-4 w-4" /> Request an Order</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Request New Order</DialogTitle>
                                <DialogDescription>
                                    Fill in the details below to request a new order. An admin will review it.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...orderForm}>
                            <form onSubmit={orderForm.handleSubmit(onOrderSubmit)} className="space-y-4">
                                <FormField
                                    control={orderForm.control}
                                    name="shopId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Shop ID</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!user}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a Shop ID" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            {agentClients.map((client) => (
                                                <SelectItem key={client.id} value={client.shopId}>
                                                {client.shopId} ({client.clientName})
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={orderForm.control}
                                    name="location"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a location" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            {locations.map((location) => (
                                                <SelectItem key={location} value={location}>
                                                {location}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={orderForm.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Enter price" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={orderForm.control}
                                    name="remarks"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Remarks</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Enter remarks (optional)" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={orderForm.formState.isSubmitting}>
                                        {orderForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Request"}
                                    </Button>
                                </DialogFooter>
                            </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardContent className="p-4">
                    <Tabs defaultValue="overview">
                        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4 lg:grid-cols-8">
                            <TabsTrigger value="overview"><User className="mr-2 h-4 w-4" />Overview</TabsTrigger>
                            <TabsTrigger value="clients"><Users className="mr-2 h-4 w-4" />Clients</TabsTrigger>
                            <TabsTrigger value="deposits"><ArrowDownToLine className="mr-2 h-4 w-4" />Deposits</TabsTrigger>
                            <TabsTrigger value="withdrawals"><ArrowUpFromLine className="mr-2 h-4 w-4" />Withdrawals</TabsTrigger>
                            <TabsTrigger value="inventory"><Boxes className="mr-2 h-4 w-4" />Inventory</TabsTrigger>
                            <TabsTrigger value="orders"><ShoppingCart className="mr-2 h-4 w-4" />Orders</TabsTrigger>
                            <TabsTrigger value="discipline"><ShieldAlert className="mr-2 h-4 w-4" />Discipline</TabsTrigger>
                            <TabsTrigger value="rewards"><Award className="mr-2 h-4 w-4" />Rewards</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="pt-6">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                                <Card className="hover:bg-muted/50 transition-colors">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                                            <Users className="h-6 w-6"/>
                                        </div>
                                        <div>
                                            <CardDescription>My Clients</CardDescription>
                                            <CardTitle className="text-3xl font-bold">{agentClients.length}</CardTitle>
                                        </div>
                                    </CardHeader>
                                </Card>
                                <Card className="hover:bg-muted/50 transition-colors">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                        <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                                            <Banknote className="h-6 w-6"/>
                                        </div>
                                        <div>
                                            <CardDescription>My Deposits</CardDescription>
                                            <CardTitle className="text-3xl font-bold">${agentDeposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</CardTitle>
                                        </div>
                                    </CardHeader>
                                </Card>
                                <Card className="hover:bg-muted/50 transition-colors">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                        <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                                             <Banknote className="h-6 w-6"/>
                                        </div>
                                        <div>
                                            <CardDescription>My Withdrawals</CardDescription>
                                            <CardTitle className="text-3xl font-bold">${agentWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}</CardTitle>
                                        </div>
                                    </CardHeader>
                                </Card>
                                <Card className="hover:bg-muted/50 transition-colors">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                         <div className="p-3 rounded-full bg-gray-500/10 text-gray-500">
                                            <Boxes className="h-6 w-6"/>
                                        </div>
                                        <div>
                                            <CardDescription>My Devices</CardDescription>
                                            <CardTitle className="text-3xl font-bold">{agentInventory.length}</CardTitle>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </div>
                        </TabsContent>
                        <TabsContent value="clients" className="pt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client Name</TableHead><TableHead>KYC Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedClients.length > 0 ? paginatedClients.map(c => (
                                        <TableRow key={c.id}><TableCell>{c.shopId}</TableCell><TableCell>{c.clientName}</TableCell><TableCell>{format(c.kycCompletedDate, "PPP")}</TableCell><TableCell><Badge variant={c.status === 'Active' ? 'default' : c.status === 'In Process' ? 'secondary' : 'destructive'}>{c.status}</Badge></TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No clients found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                             {renderPaginationControls(clientsTotalPages, clientsPage, setClientsPage)}
                        </TabsContent>
                        <TabsContent value="deposits" className="pt-4 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium mb-2 flex items-center"><Activity className="mr-2 h-5 w-5 text-green-500"/>Deposits</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedDeposits.length > 0 ? paginatedDeposits.map((d,i) => (
                                            <TableRow key={d.id}><TableCell>{d.shopId}</TableCell><TableCell>{d.clientName}</TableCell><TableCell>{format(d.date, "PPP")}</TableCell><TableCell className="text-right">${d.amount.toFixed(2)}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center">No deposits found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                                {renderPaginationControls(depositsTotalPages, depositsPage, setDepositsPage)}
                            </div>
                        </TabsContent>
                        <TabsContent value="withdrawals" className="pt-4 space-y-6">
                             <div>
                                <h3 className="text-lg font-medium mb-2 flex items-center"><Activity className="mr-2 h-5 w-5 text-red-500"/>Withdrawals</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedWithdrawals.length > 0 ? paginatedWithdrawals.map((w,i) => (
                                            <TableRow key={w.id}><TableCell>{w.shopId}</TableCell><TableCell>{w.clientName}</TableCell><TableCell>{format(w.date, "PPP")}</TableCell><TableCell className="text-right">${w.amount.toFixed(2)}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center">No withdrawals found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                                 {renderPaginationControls(withdrawalsTotalPages, withdrawalsPage, setWithdrawalsPage)}
                            </div>
                        </TabsContent>
                        <TabsContent value="inventory" className="pt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>IMEI</TableHead><TableHead>Model</TableHead><TableHead>Color</TableHead><TableHead>Last Updated</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedInventory.length > 0 ? paginatedInventory.map(d => (
                                        <TableRow key={d.id}><TableCell>{d.imei}</TableCell><TableCell>{d.model}</TableCell><TableCell>{d.color}</TableCell><TableCell>{format(new Date(d.updatedAt), "PPP p")}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No devices assigned to you.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                             {renderPaginationControls(inventoryTotalPages, inventoryPage, setInventoryPage)}
                        </TabsContent>
                        <TabsContent value="orders" className="pt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedOrders.length > 0 ? paginatedOrders.map(o => (
                                        <TableRow key={o.id}><TableCell>{o.shopId}</TableCell><TableCell>{o.location}</TableCell><TableCell className="text-right">${o.price.toFixed(2)}</TableCell><TableCell><Badge variant={o.status === 'Approved' ? 'default' : o.status === 'Pending' ? 'secondary' : 'destructive'}>{o.status}</Badge></TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No orders found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                            {renderPaginationControls(ordersTotalPages, ordersPage, setOrdersPage)}
                        </TabsContent>
                        <TabsContent value="discipline" className="pt-4">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Absences</h3>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {paginatedAbsences.length > 0 ? paginatedAbsences.map((a,i) => (
                                                <TableRow key={a.id}><TableCell>{format(a.date, "PPP")}</TableCell><TableCell>{a.remarks}</TableCell></TableRow>
                                            )) : <TableRow><TableCell colSpan={2} className="text-center">No absences found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                    {renderPaginationControls(absencesTotalPages, absencesPage, setAbsencesPage)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Penalties</h3>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {paginatedPenalties.length > 0 ? paginatedPenalties.map((p,i) => (
                                                <TableRow key={p.id}><TableCell>{format(p.date, "PPP")}</TableCell><TableCell>{p.remarks}</TableCell><TableCell className="text-right">${p.amount.toFixed(2)}</TableCell></TableRow>
                                            )) : <TableRow><TableCell colSpan={3} className="text-center">No penalties found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                     {renderPaginationControls(penaltiesTotalPages, penaltiesPage, setPenaltiesPage)}
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="rewards" className="pt-4">
                             <h3 className="text-lg font-medium mb-2 flex items-center"><Award className="mr-2 h-5 w-5"/>My Rewards</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedRewards.length > 0 ? paginatedRewards.map((r,i) => (
                                        <TableRow key={r.id}><TableCell>{format(r.date, "PPP")}</TableCell><TableCell>{r.remarks}</TableCell><TableCell><Badge variant={r.status === 'Claimed' ? 'secondary' : 'default'}>{r.status}</Badge></TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No rewards found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                             {renderPaginationControls(rewardsTotalPages, rewardsPage, setRewardsPage)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

export default withAuth(ProfilePage, ['Agent', 'Admin', 'Superadmin']);
