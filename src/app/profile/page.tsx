
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Loader2, FileText, Video, Boxes, ClipboardList, User, Banknote, Users, Activity, ShoppingCart, ShieldAlert, Award } from "lucide-react"
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
                    <Avatar className="w-24 h-24 mb-4">
                        <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="person" />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <div className="flex justify-between"><span className="font-semibold text-foreground">Role:</span> <Badge variant="secondary">{user.role}</Badge></div>
                        <div className="flex justify-between"><span className="font-semibold text-foreground">Type:</span> <Badge variant="secondary">{user.agentType}</Badge></div>
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
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="clients">Clients</TabsTrigger>
                            <TabsTrigger value="transactions">Transactions</TabsTrigger>
                            <TabsTrigger value="inventory">Inventory</TabsTrigger>
                            <TabsTrigger value="orders">Orders</TabsTrigger>
                            <TabsTrigger value="discipline">Discipline</TabsTrigger>
                            <TabsTrigger value="rewards">Rewards</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="pt-6">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Clients</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{agentClients.length}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Deposits</CardTitle><Banknote className="h-4 w-4 text-muted-foreground"/></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">${agentDeposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Withdrawals</CardTitle><Banknote className="h-4 w-4 text-muted-foreground"/></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">${agentWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Devices</CardTitle><Boxes className="h-4 w-4 text-muted-foreground"/></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{agentInventory.length}</div></CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                        <TabsContent value="clients" className="pt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client Name</TableHead><TableHead>KYC Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {agentClients.length > 0 ? agentClients.map(c => (
                                        <TableRow key={c.id}><TableCell>{c.shopId}</TableCell><TableCell>{c.clientName}</TableCell><TableCell>{format(c.kycCompletedDate, "PPP")}</TableCell><TableCell><Badge variant={c.status === 'Active' ? 'default' : c.status === 'In Process' ? 'secondary' : 'destructive'}>{c.status}</Badge></TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No clients found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="transactions" className="pt-4">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center"><Activity className="mr-2 h-5 w-5"/>Deposits</h3>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {agentDeposits.length > 0 ? agentDeposits.map((d,i) => (
                                                <TableRow key={d.id}><TableCell>{d.shopId}</TableCell><TableCell>{d.clientName}</TableCell><TableCell>{format(d.date, "PPP")}</TableCell><TableCell className="text-right">${d.amount.toFixed(2)}</TableCell></TableRow>
                                            )) : <TableRow><TableCell colSpan={4} className="text-center">No deposits found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center"><Activity className="mr-2 h-5 w-5"/>Withdrawals</h3>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {agentWithdrawals.length > 0 ? agentWithdrawals.map((w,i) => (
                                                <TableRow key={w.id}><TableCell>{w.shopId}</TableCell><TableCell>{w.clientName}</TableCell><TableCell>{format(w.date, "PPP")}</TableCell><TableCell className="text-right">${w.amount.toFixed(2)}</TableCell></TableRow>
                                            )) : <TableRow><TableCell colSpan={4} className="text-center">No withdrawals found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="inventory" className="pt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>IMEI</TableHead><TableHead>Model</TableHead><TableHead>Color</TableHead><TableHead>Last Updated</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {agentInventory.length > 0 ? agentInventory.map(d => (
                                        <TableRow key={d.id}><TableCell>{d.imei}</TableCell><TableCell>{d.model}</TableCell><TableCell>{d.color}</TableCell><TableCell>{format(new Date(d.updatedAt), "PPP p")}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No devices assigned to you.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="orders" className="pt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {agentOrders.length > 0 ? agentOrders.map(o => (
                                        <TableRow key={o.id}><TableCell>{o.shopId}</TableCell><TableCell>{o.location}</TableCell><TableCell className="text-right">${o.price.toFixed(2)}</TableCell><TableCell><Badge variant={o.status === 'Approved' ? 'default' : o.status === 'Pending' ? 'secondary' : 'destructive'}>{o.status}</Badge></TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">No orders found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="discipline" className="pt-4">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Absences</h3>
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
                                    <h3 className="text-lg font-medium mb-2 flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Penalties</h3>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {agentPenalties.length > 0 ? agentPenalties.map((p,i) => (
                                                <TableRow key={p.id}><TableCell>{format(p.date, "PPP")}</TableCell><TableCell>{p.remarks}</TableCell><TableCell className="text-right">${p.amount.toFixed(2)}</TableCell></TableRow>
                                            )) : <TableRow><TableCell colSpan={3} className="text-center">No penalties found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="rewards" className="pt-4">
                             <h3 className="text-lg font-medium mb-2 flex items-center"><Award className="mr-2 h-5 w-5"/>My Rewards</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Remarks</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {agentRewards.length > 0 ? agentRewards.map((r,i) => (
                                        <TableRow key={r.id}><TableCell>{format(r.date, "PPP")}</TableCell><TableCell>{r.remarks}</TableCell><TableCell><Badge variant={r.status === 'Claimed' ? 'secondary' : 'default'}>{r.status}</Badge></TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No rewards found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
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

    