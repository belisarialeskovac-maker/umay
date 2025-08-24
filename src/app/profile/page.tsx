
"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { X } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore"
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


function ProfilePage() {
  const { user } = useAuth();

  const [agentClients, setAgentClients] = useState<Client[]>([]);
  const [agentDeposits, setAgentDeposits] = useState<Transaction[]>([]);
  const [agentWithdrawals, setAgentWithdrawals] = useState<Transaction[]>([]);
  const [agentInventory, setAgentInventory] = useState<Inventory[]>([]);
  const [agentOrders, setAgentOrders] = useState<Order[]>([]);
  const [agentAbsences, setAgentAbsences] = useState<Absence[]>([]);
  const [agentPenalties, setAgentPenalties] = useState<Penalty[]>([]);
  const [agentRewards, setAgentRewards] = useState<Reward[]>([]);

  useEffect(() => {
    if (user) {
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
            const q = query(collection(db, col), where("agent", "==", user.name));
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
  }, [user]);

  if (!user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Loading profile...</p>
        </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          View your personal records and performance metrics.
        </p>
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
                </Tabs>
            </CardContent>
        </Card>
    </div>
  )
}

export default withAuth(ProfilePage, ['Agent', 'Admin', 'Superadmin']);
