
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isToday, isThisMonth, startOfToday } from "date-fns"
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, FileText, RefreshCw, Languages, Copy, Download, Upload, Calendar, BarChart, Banknote, ClipboardList, Video } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, onSnapshot, Timestamp, collection, addDoc } from "firebase/firestore"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


type ClientInformation = {
    id: string; // Use string for firestore doc id consistency
    shopId: string;
    assets: string;
    clientDetails: string;
    conversationSummary: string;
    planForTomorrow: string;
    isCollapsed: boolean;
};

const orderFormSchema = z.object({
  shopId: z.string().min(1, "A shop ID is required."),
  location: z.string().min(2, "Location must be at least 2 characters."),
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
    dailyAddedClients,
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
  
  const [clientInfoList, setClientInfoList] = useState<ClientInformation[]>([]);
  const [generatedReport, setGeneratedReport] = useState("");
  const [isReportCardCollapsed, setReportCardCollapsed] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isReportDataLoading, setIsReportDataLoading] = useState(true);

  const getReportDocRef = useCallback(() => {
    if (!user) return null;
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    return doc(db, 'dailyReports', `${user.uid}_${todayStr}`);
  }, [user]);

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
    if (!user || !getReportDocRef()) {
        setIsReportDataLoading(false);
        return;
    };
    
    const docRef = getReportDocRef();
    if (!docRef) return;
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setClientInfoList(data.clients || []);
        } else {
            // No report for today, start with a default one
             setClientInfoList([{ id: new Date().getTime().toString(), shopId: '', assets: '', clientDetails: '', conversationSummary: '', planForTomorrow: '', isCollapsed: false }]);
        }
        setIsReportDataLoading(false);
    }, (error) => {
        console.error("Error fetching daily report:", error);
        toast({title: "Error", description: "Could not load today's report.", variant: "destructive"});
        setIsReportDataLoading(false);
    });

    return () => unsubscribe();
  }, [user, getReportDocRef, toast]);


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
  }, [user, clients, deposits, withdrawals, inventory, orders, absences, penalties, rewards, dailyAddedClients, dataLoading]);

  const agentStats = useMemo(() => {
    if (!user) return {
      addedToday: 0,
      monthlyAdded: 0,
      openShops: 0,
      monthlyDeposits: 0,
    };

    const addedToday = dailyAddedClients.filter(c => c.assignedAgent === user.name && isToday(c.date)).length;
    const monthlyAdded = dailyAddedClients.filter(c => c.assignedAgent === user.name && isThisMonth(c.date)).length;
    const openShops = clients.filter(c => c.agent === user.name && isThisMonth(c.kycCompletedDate)).length;
    const monthlyDeposits = deposits
      .filter(d => d.agent === user.name && isThisMonth(d.date))
      .reduce((sum, d) => sum + d.amount, 0);

    return { addedToday, monthlyAdded, openShops, monthlyDeposits };
  }, [user, dailyAddedClients, clients, deposits]);


  const saveReportData = async (updatedClientInfoList: ClientInformation[]) => {
    const docRef = getReportDocRef();
    if (!docRef) return;
    try {
        await setDoc(docRef, { clients: updatedClientInfoList, lastUpdated: Timestamp.now() }, { merge: true });
    } catch (error) {
        console.error("Failed to save report data:", error);
        toast({ title: "Save Error", description: "Failed to save report progress.", variant: "destructive" });
    }
  };


  const addClient = () => {
    const newClient: ClientInformation = {
      id: new Date().getTime().toString(),
      shopId: '',
      assets: '',
      clientDetails: '',
      conversationSummary: '',
      planForTomorrow: '',
      isCollapsed: false,
    };
    const updatedList = [...clientInfoList, newClient];
    setClientInfoList(updatedList);
    saveReportData(updatedList);
  };
  
  const removeClient = (id: string) => {
    const updatedList = clientInfoList.filter(client => client.id !== id);
    setClientInfoList(updatedList);
    saveReportData(updatedList);
  };
  
  const handleClientInfoChange = (id: string, field: keyof Omit<ClientInformation, 'id' | 'isCollapsed'>, value: string) => {
    const updatedList = clientInfoList.map(client =>
      client.id === id ? { ...client, [field]: value } : client
    );
    setClientInfoList(updatedList);
    // Debounce this in a real app if performance is an issue
    saveReportData(updatedList);
  };

  const toggleClientCollapse = (id: string) => {
    const updatedList = clientInfoList.map(client =>
      client.id === id ? { ...client, isCollapsed: !client.isCollapsed } : client
    );
    setClientInfoList(updatedList);
    // No need to save collapse state to DB
  }

  const getProgress = (client: ClientInformation) => {
    const requiredFields: (keyof Omit<ClientInformation, 'id'| 'isCollapsed' | 'shopId' | 'assets' | 'clientDetails'>)[] = ['conversationSummary', 'planForTomorrow'];
    const filledCount = requiredFields.filter(field => client[field].trim() !== '').length;
    return (filledCount / requiredFields.length) * 100;
  }

  const handleGenerateReport = () => {
    if (!user) {
        toast({ title: "User not found", description: "Please log in to generate a report.", variant: "destructive" });
        return;
    }

    const isAnyClientInfoFilled = clientInfoList.some(c => c.conversationSummary.trim() || c.planForTomorrow.trim());
    if (!isAnyClientInfoFilled) {
        toast({ title: "No client information", description: "Please fill in some client information before generating a report.", variant: "destructive" });
        return;
    }
    
    const today = new Date();
    const dateString = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    const reportParts = [
        `Agent Report - ${dateString}`,
        '',
        'AGENT INFORMATION:',
        `Name: ${user.name}`,
        `Added Client Today: ${agentStats.addedToday}`,
        `Monthly Client Added: ${agentStats.monthlyAdded}`,
        `Open Shops: ${agentStats.openShops}`,
        `Deposits: $${agentStats.monthlyDeposits.toFixed(2)}`,
        '',
        'CLIENT INFORMATION:',
        '',
    ];

    clientInfoList.forEach((client, index) => {
        if(client.conversationSummary.trim() || client.planForTomorrow.trim()) {
            reportParts.push(`CLIENT ${index + 1}:`);
            reportParts.push(`Shop ID: ${client.shopId || 'None'}`);
            reportParts.push(`Client Details: ${client.clientDetails || 'None'}`);
            reportParts.push(`Assets: ${client.assets || 'None'}`);
            reportParts.push(`Conversation Summary: ${client.conversationSummary}`);
            reportParts.push(`Plan for Tomorrow: ${client.planForTomorrow}`);
            reportParts.push('');
        }
    });

    setGeneratedReport(reportParts.join('\n'));
    setReportCardCollapsed(false);
    toast({ title: "Report Generated", description: "The report has been successfully generated." });
  };
  
  const handleClearReport = () => setGeneratedReport('');

  const handleCopyReport = () => {
      if (!generatedReport) {
          toast({ title: "Nothing to copy", description: "Generate a report first.", variant: "destructive" });
          return;
      }
      navigator.clipboard.writeText(generatedReport);
      toast({ title: "Report Copied", description: "The report has been copied to your clipboard." });
  }

  const handleExportJson = () => {
      if (!user || clientInfoList.every(c => !c.conversationSummary.trim() && !c.planForTomorrow.trim())) {
          toast({ title: "No data to export", description: "Please fill in client info first.", variant: "destructive"});
          return;
      }
      const data = {
          agent: user.name,
          stats: agentStats,
          clients: clientInfoList.map(({isCollapsed, ...rest}) => rest), // Don't export UI state
          exportedAt: new Date().toISOString(),
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `report_${user.name}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast({ title: "JSON Exported", description: "The report data has been exported." });
  };
  
  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text === 'string') {
                  const data = JSON.parse(text);
                  if (data.agent && data.clients && data.agent === user?.name) {
                      const importedClients = data.clients.map((c: any, i: number) => ({...c, id: c.id || new Date().getTime().toString() + i, isCollapsed: false}));
                      setClientInfoList(importedClients);
                      saveReportData(importedClients);
                      toast({ title: "JSON Imported", description: "Report data has been successfully imported." });
                  } else {
                      throw new Error("Invalid JSON format or data for another agent.");
                  }
              }
          } catch (error: any) {
              toast({ title: "Import Failed", description: error.message || "The selected file is not a valid report JSON.", variant: "destructive" });
          }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input
  };


  if (authLoading || dataLoading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">
            View your personal records and performance metrics.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
                <Link href="/videocall-template">
                    <Video className="mr-2 h-4 w-4" /> Videocall Template
                </Link>
            </Button>
            <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                <DialogTrigger asChild>
                    <Button><ClipboardList className="mr-2 h-4 w-4" /> Request an Order</Button>
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
                                <FormControl>
                                    <Input placeholder="Enter location" {...field} />
                                </FormControl>
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
        </div>
      </div>

      <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Agent Details: {user.name}</CardTitle>
                        <CardDescription>
                            Email: {user.email} | Type: {user.agentType} | Hired: {format(user.dateHired, "PPP")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-8">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="clients">Clients</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="inventory">Inventory</TabsTrigger>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="discipline">Discipline</TabsTrigger>
                        <TabsTrigger value="rewards">Rewards</TabsTrigger>
                        <TabsTrigger value="create-report">Create Report</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="pt-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader><CardTitle>My Clients</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{agentClients.length}</div></CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>My Total Deposits</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">${agentDeposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>My Total Withdrawals</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">${agentWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>My Devices Held</CardTitle></CardHeader>
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
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No clients found.</TableCell></TableRow>}
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
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No devices assigned to you.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="orders">
                         <Table>
                            <TableHeader><TableRow><TableHead>Shop ID</TableHead><TableHead>Location</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agentOrders.length > 0 ? agentOrders.map(o => (
                                    <TableRow key={o.id}><TableCell>{o.shopId}</TableCell><TableCell>{o.location}</TableCell><TableCell>${o.price.toFixed(2)}</TableCell><TableCell><Badge variant={o.status === 'Approved' ? 'default' : o.status === 'Pending' ? 'secondary' : 'destructive'}>{o.status}</Badge></TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No orders found.</TableCell></TableRow>}
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
                                )) : <TableRow><TableCell colSpan={3} className="text-center">No rewards found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TabsContent>
                     <TabsContent value="create-report" className="pt-4 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>My Performance Statistics</CardTitle>
                                <CardDescription>This data is automatically calculated for the current month.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {user && (
                                    <div className="space-y-4 pt-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/>Added Client Today</Label>
                                                <Input value={agentStats.addedToday} readOnly disabled />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/>Monthly Client Added</Label>
                                                <Input value={agentStats.monthlyAdded} readOnly disabled/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-muted-foreground"><BarChart className="h-4 w-4"/>Open Shops</Label>
                                                <Input value={agentStats.openShops} readOnly disabled/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-muted-foreground"><Banknote className="h-4 w-4"/>Deposits</Label>
                                                <Input value={`$${agentStats.monthlyDeposits.toFixed(2)}`} readOnly disabled/>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>Client Information</CardTitle>
                                <CardDescription>Enter details for each client you interacted with today. Your work is saved automatically.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={addClient}>
                                <Plus className="mr-2 h-4 w-4"/> Add Client
                            </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isReportDataLoading ? (
                                    <div className="flex items-center justify-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : clientInfoList.length > 0 ? (
                                    clientInfoList.map((client, index) => (
                                        <Card key={client.id} className="overflow-hidden">
                                            <CardHeader className="bg-muted/50 p-4 flex flex-row justify-between items-center cursor-pointer" onClick={() => toggleClientCollapse(client.id)}>
                                                <div className="flex items-center gap-4">
                                                    <CardTitle className="text-lg">Client {index + 1}</CardTitle>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={getProgress(client)} className="w-24 h-2"/>
                                                        <span className="text-xs text-muted-foreground">{getProgress(client) === 100 ? '2/2 completed' : `${Math.round(getProgress(client)/100 * 2)}/2 completed`}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeClient(client.id); }} className="h-8 w-8">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        {client.isCollapsed ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            {!client.isCollapsed && (
                                                <CardContent className="p-6 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor={`shopId-${client.id}`}>Shop ID</Label>
                                                            <Select 
                                                                value={client.shopId} 
                                                                onValueChange={(value) => handleClientInfoChange(client.id, 'shopId', value)}
                                                                disabled={!user}
                                                            >
                                                                <SelectTrigger id={`shopId-${client.id}`}>
                                                                    <SelectValue placeholder="Select a shop ID" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {agentClients.map(c => (
                                                                        <SelectItem key={c.id} value={c.shopId}>
                                                                            {c.shopId} - ({c.clientName})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor={`assets-${client.id}`}>Assets</Label>
                                                            <Input id={`assets-${client.id}`} value={client.assets} onChange={(e) => handleClientInfoChange(client.id, 'assets', e.target.value)} placeholder="Enter client assets"/>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`clientDetails-${client.id}`}>Client Details</Label>
                                                        <Textarea id={`clientDetails-${client.id}`} value={client.clientDetails} onChange={(e) => handleClientInfoChange(client.id, 'clientDetails', e.target.value)} placeholder="Client Name/ Age/ Job/Location"/>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`conversationSummary-${client.id}`}>Conversation Summary *</Label>
                                                        <Textarea id={`conversationSummary-${client.id}`} value={client.conversationSummary} onChange={(e) => handleClientInfoChange(client.id, 'conversationSummary', e.target.value)} placeholder="Summarize your conversation"/>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`planForTomorrow-${client.id}`}>Plan for Tomorrow *</Label>
                                                        <Textarea id={`planForTomorrow-${client.id}`} value={client.planForTomorrow} onChange={(e) => handleClientInfoChange(client.id, 'planForTomorrow', e.target.value)} placeholder="What's the plan for tomorrow?"/>
                                                    </div>
                                                </CardContent>
                                            )}
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">No client entries for today's report.</div>
                                )}
                                <Button variant="outline" onClick={addClient} className="w-full">
                                    <Plus className="mr-2 h-4 w-4"/> Add Another Client
                                </Button>
                            </CardContent>
                        </Card>
      
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center cursor-pointer" onClick={() => setReportCardCollapsed(!isReportCardCollapsed)}>
                                <div>
                                    <CardTitle className="flex items-center"><FileText className="mr-2"/>Generate Your Report</CardTitle>
                                    <CardDescription>Click here to create, export, and manage your completed report</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm">{isReportCardCollapsed ? <ChevronDown/> : <ChevronUp/>} {isReportCardCollapsed ? 'Show' : 'Hide'}</Button>
                            </CardHeader>
                            {!isReportCardCollapsed && (
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <Button onClick={handleGenerateReport}><FileText className="mr-2 h-4 w-4" />Generate Report</Button>
                                        <Button variant="outline" onClick={handleClearReport}><RefreshCw className="mr-2 h-4 w-4" />Clear</Button>
                                        <Button variant="outline" onClick={() => {toast({title: "Coming Soon!", description: "Translation feature will be available shortly."})}}><Languages className="mr-2 h-4 w-4" />Translate</Button>
                                        <Button variant="outline" onClick={handleCopyReport}><Copy className="mr-2 h-4 w-4" />Copy</Button>
                                        <Button variant="outline" onClick={handleExportJson}><Download className="mr-2 h-4 w-4" />Export JSON</Button>
                                        <Button variant="outline" asChild>
                                            <Label htmlFor="import-json" className="cursor-pointer">
                                                <Upload className="mr-2 h-4 w-4" />Import JSON
                                                <Input id="import-json" type="file" className="hidden" accept=".json" onChange={handleImportJson}/>
                                            </Label>
                                        </Button>
                                    </div>
                                    <Textarea 
                                        value={generatedReport}
                                        readOnly
                                        placeholder="Your generated report will appear here..."
                                        className="min-h-[200px] bg-muted"
                                    />
                                </CardContent>
                            )}
                        </Card>
                     </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  )
}

export default withAuth(ProfilePage, ['Agent', 'Admin', 'Superadmin']);
