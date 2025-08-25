
"use client"

import { useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, X, Hourglass, ThumbsUp, ThumbsDown, Loader2, MoreHorizontal, Trash2, Edit } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/data-context"
import withAuth from "@/components/with-auth"
import type { Order } from "@/context/data-context"

const orderStatus = ["Pending", "Approved", "Rejected"] as const;
type OrderStatus = (typeof orderStatus)[number];

const locations = [
  "Albania", "Argentina", "Australia", "Canada", "France", "Germany", "Italy", "Japan",
  "Malaysia", "Netherlands", "Philippines", "Russia", "Singapore", "South Korea",
  "Spain", "Switzerland", "Thailand", "Turkey", "United Arab Emirates",
  "United Kingdom", "United States", "Vietnam", "China"
];

const formSchema = z.object({
  agent: z.string().min(1, "An agent is required."),
  shopId: z.string().min(1, "A shop ID is required."),
  location: z.string().min(1, "Location is required."),
  price: z.coerce.number().positive("Price must be a positive number."),
  remarks: z.string(),
})

function OrderRequestPage() {
  const [open, setOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const { orders, agents, clients, loading: dataLoading } = useData();
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agent: "",
      shopId: "",
      location: "",
      price: 0,
      remarks: "",
    },
  })

  const watchedAgent = form.watch("agent");
  const displayAgents = useMemo(() => agents.filter(agent => agent.role !== 'Superadmin'), [agents]);


  const agentClients = useMemo(() => {
    if (!watchedAgent) return [];
    return clients.filter(client => client.agent === watchedAgent);
  }, [watchedAgent, clients]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const newOrder = {
        ...values,
        status: 'Pending',
    }
    try {
      await addDoc(collection(db, "orders"), newOrder);
      toast({
        title: "Order Requested",
        description: `Successfully requested order for Shop ID ${values.shopId}.`,
      })
      setOpen(false)
      form.reset()
    } catch (error) {
      console.error("Error adding order: ", error);
      toast({
        title: "Error",
        description: "Failed to request order.",
        variant: "destructive"
      });
    }
  }
  
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      toast({
          title: "Order Status Updated",
          description: `Order has been moved to ${newStatus}.`
      })
    } catch(error) {
       console.error("Error updating order status: ", error);
       toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive"
      });
    }
  }

  const handleDeleteOrder = useCallback(async () => {
    if (!orderToDelete) return;
    try {
      await deleteDoc(doc(db, "orders", orderToDelete.id));
      toast({
        title: "Order Deleted",
        description: `Order for ${orderToDelete.shopId} has been deleted.`,
        variant: "destructive"
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({ title: "Error", description: "Failed to delete order.", variant: "destructive" });
    }
    setDeleteAlertOpen(false);
    setOrderToDelete(null);
  }, [orderToDelete, toast]);

  const openDeleteDialog = (order: Order) => {
    setOrderToDelete(order);
    setDeleteAlertOpen(true);
  };


  const renderOrderTable = (status: OrderStatus) => {
    const filteredOrders = orders.filter(order => order.status === status);

    if (filteredOrders.length === 0) {
      return (
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] p-6">
            <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                No {status} Orders
            </h2>
            <p className="text-muted-foreground mt-2">
                There are currently no orders with this status.
            </p>
            </div>
        </div>
      )
    }

    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Shop ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.agent}</TableCell>
                <TableCell>{order.shopId}</TableCell>
                <TableCell>{order.location}</TableCell>
                <TableCell>${order.price.toFixed(2)}</TableCell>
                <TableCell>{order.remarks || 'N/A'}</TableCell>
                <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                         {order.status !== 'Approved' && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'Approved')}>
                               <Check className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                         )}
                         {order.status !== 'Rejected' && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'Rejected')}>
                                <X className="mr-2 h-4 w-4" /> Reject
                            </DropdownMenuItem>
                         )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDeleteDialog(order)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-foreground">Order Request</h1>
          <p className="text-muted-foreground mt-1">
            Request an order and manage its status.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Order</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Order</DialogTitle>
              <DialogDescription>
                Fill in the details below to request a new order.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="agent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {displayAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.name}>
                              {agent.name}
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
                  name="shopId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop ID</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchedAgent}>
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  <Button type="submit">Request Order</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="Pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="Pending">
              <Hourglass className="mr-2 h-4 w-4"/>Pending
              <Badge className="ml-2">{orders.filter(o => o.status === 'Pending').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Approved">
              <ThumbsUp className="mr-2 h-4 w-4"/>Approved
              <Badge className="ml-2">{orders.filter(o => o.status === 'Approved').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Rejected">
              <ThumbsDown className="mr-2 h-4 w-4"/>Rejected
              <Badge className="ml-2">{orders.filter(o => o.status === 'Rejected').length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="Pending" className="mt-4">
          {renderOrderTable("Pending")}
        </TabsContent>
        <TabsContent value="Approved" className="mt-4">
          {renderOrderTable("Approved")}
        </TabsContent>
        <TabsContent value="Rejected" className="mt-4">
          {renderOrderTable("Rejected")}
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the order record for {orderToDelete?.shopId}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteOrder}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  )
}

export default withAuth(OrderRequestPage);
