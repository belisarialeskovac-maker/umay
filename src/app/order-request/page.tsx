
"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, X, Hourglass, ThumbsUp, ThumbsDown } from "lucide-react"

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

const agentSchema = z.object({
  name: z.string(),
  email: z.string(),
  dateHired: z.date(),
  agentType: z.string(),
})
type Agent = z.infer<typeof agentSchema>;

const clientSchema = z.object({
  agent: z.string(),
  shopId: z.string(),
  clientName: z.string(),
});
type Client = z.infer<typeof clientSchema>;

const orderStatus = ["Pending", "Approved", "Rejected"] as const;
type OrderStatus = (typeof orderStatus)[number];

const formSchema = z.object({
  agent: z.string().min(1, "An agent is required."),
  shopId: z.string().min(1, "A shop ID is required."),
  location: z.string().min(2, "Location must be at least 2 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  remarks: z.string(),
})

type Order = z.infer<typeof formSchema> & {
  id: number;
  status: OrderStatus;
}

export default function OrderRequestPage() {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const [clients, setClients] = useState<Client[]>([])
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

  const agentClients = useMemo(() => {
    if (!watchedAgent) return [];
    return clients.filter(client => client.agent === watchedAgent);
  }, [watchedAgent, clients]);

  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      setRegisteredAgents(JSON.parse(storedAgents).map((a: any) => ({ ...a, dateHired: new Date(a.dateHired) })));
    }

    const storedClients = localStorage.getItem("clients");
    if (storedClients) {
      setClients(JSON.parse(storedClients));
    }
    
    const storedOrders = localStorage.getItem("orders");
    if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
    }
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newOrder: Order = {
        ...values,
        id: new Date().getTime(),
        status: 'Pending',
    }
    const updatedOrders = [...orders, newOrder]
    setOrders(updatedOrders)
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    toast({
      title: "Order Requested",
      description: `Successfully requested order for Shop ID ${values.shopId}.`,
    })
    setOpen(false)
    form.reset()
  }
  
  const updateOrderStatus = (orderId: number, newStatus: OrderStatus) => {
    const updatedOrders = orders.map(order => 
        order.id === orderId ? {...order, status: newStatus} : order
    );
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    toast({
        title: "Order Status Updated",
        description: `Order has been moved to ${newStatus}.`
    })
  }

  const renderOrderTable = (status: OrderStatus) => {
    const filteredOrders = orders.filter(order => order.status === status);

    return filteredOrders.length > 0 ? (
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
                <TableCell className="flex gap-2">
                    {order.status === 'Pending' && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'Approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'Rejected')}><X className="mr-2 h-4 w-4" />Reject</Button>
                        </>
                    )}
                    {order.status === 'Approved' && (
                        <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'Rejected')}><X className="mr-2 h-4 w-4" />Reject</Button>
                    )}
                    {order.status === 'Rejected' && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'Approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                    )}
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
            No {status} Orders
          </h2>
          <p className="text-muted-foreground mt-2">
            There are currently no orders with this status.
          </p>
        </div>
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
                          {registeredAgents.map((agent) => (
                            <SelectItem key={agent.name} value={agent.name}>
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
                            <SelectItem key={client.shopId} value={client.shopId}>
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
                      <FormControl>
                        <Input placeholder="Enter location" {...field} />
                      </FormControl>
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
    </div>
  )
}
