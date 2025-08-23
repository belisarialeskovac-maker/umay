
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const agentSchema = z.object({
    name: z.string(),
    email: z.string(),
    dateHired: z.date(),
    agentType: z.string(),
})

type Agent = z.infer<typeof agentSchema>;

const clientStatus = ["In Process", "Active", "Eliminated"] as const;

const formSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required."),
  clientName: z.string().min(2, "Client name must be at least 2 characters."),
  agent: z.string().min(1, "An agent is required."),
  kycCompletedDate: z.date({
    required_error: "KYC completed date is required.",
  }),
  status: z.enum(clientStatus),
  clientDetails: z.string(),
})

type Client = z.infer<typeof formSchema>

export default function ClientDetailsPage() {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const { toast } = useToast()

  const form = useForm<Client>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopId: "",
      clientName: "",
      agent: "",
      clientDetails: "",
      status: "In Process",
    },
  })

  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      const parsedAgents = JSON.parse(storedAgents).map((agent: any) => ({
        ...agent,
        dateHired: new Date(agent.dateHired),
      }));
      setRegisteredAgents(parsedAgents);
    }

    const storedClients = localStorage.getItem("clients");
    if (storedClients) {
        const parsedClients = JSON.parse(storedClients).map((client: any) => ({
            ...client,
            kycCompletedDate: new Date(client.kycCompletedDate),
        }));
        setClients(parsedClients);
    }
  }, []);

  function onSubmit(values: Client) {
    const updatedClients = [...clients, values]
    setClients(updatedClients)
    localStorage.setItem("clients", JSON.stringify(updatedClients));
    toast({
      title: "Client Added",
      description: `Successfully added ${values.clientName}.`,
    })
    setOpen(false)
    form.reset()
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Details</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client information.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add New Client</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new client.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="shopId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Shop ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField control={form.control} name="agent" render={({ field }) => (
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
                <FormField
                  control={form.control}
                  name="kycCompletedDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>KYC Completed Date</FormLabel>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientStatus.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
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
                    name="clientDetails"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Client Details</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Enter client details..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                  <Button type="submit">Add Client</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      {clients.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>KYC Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <TableRow key={index}>
                  <TableCell>{client.shopId}</TableCell>
                  <TableCell>{client.clientName}</TableCell>
                  <TableCell>{client.agent}</TableCell>
                  <TableCell>{format(client.kycCompletedDate, "PPP")}</TableCell>
                  <TableCell>
                    <Badge variant={
                        client.status === 'Active' ? 'default' : 
                        client.status === 'In Process' ? 'secondary' : 'destructive'
                    }>
                        {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.clientDetails}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              No Clients Added
            </h2>
            <p className="text-muted-foreground mt-2">
              Add a new client to see their details here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
