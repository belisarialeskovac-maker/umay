
"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/data-context"
import withAuth from "@/components/with-auth"
import type { Client } from "@/context/data-context"

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

type ClientFormData = z.infer<typeof formSchema>;

const CLIENTS_PER_PAGE = 20;

function ClientDetailsPage() {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  
  const [currentPage, setCurrentPage] = useState(1);

  const { clients, agents, loading: dataLoading } = useData();
  const { toast } = useToast()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopId: "",
      clientName: "",
      agent: "",
      clientDetails: "",
      status: "In Process",
    },
  })
  
  const editForm = useForm<ClientFormData>({
    resolver: zodResolver(formSchema)
  });
  
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
    const endIndex = startIndex + CLIENTS_PER_PAGE;
    return clients.slice(startIndex, endIndex);
  }, [clients, currentPage]);
  
  const totalPages = Math.ceil(clients.length / CLIENTS_PER_PAGE);

  async function onSubmit(values: ClientFormData) {
    try {
      await addDoc(collection(db, "clients"), values);
      toast({
        title: "Client Added",
        description: `Successfully added ${values.clientName}.`,
      })
      setOpen(false)
      form.reset()
    } catch(error) {
      console.error("Error adding client: ", error);
      toast({
        title: "Error",
        description: "Failed to add client.",
        variant: "destructive"
      });
    }
  }

  async function onEditSubmit(values: ClientFormData) {
    if (!clientToEdit) return;
    try {
        const clientRef = doc(db, "clients", clientToEdit.id);
        await updateDoc(clientRef, values);
        toast({ title: "Client Updated", description: "Client details have been updated." });
        setEditOpen(false);
    } catch(error: any) {
        toast({ title: "Error", description: error.message || "Failed to update client.", variant: "destructive" });
    }
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
        await deleteDoc(doc(db, "clients", clientToDelete.id));
        toast({
            title: "Client Deleted",
            description: `${clientToDelete.clientName} has been removed from the database.`,
            variant: "destructive"
        })
    } catch (error: any) {
         toast({ title: "Error", description: error.message || "Failed to delete client.", variant: "destructive" });
    }
    setDeleteAlertOpen(false);
    setClientToDelete(null);
  }


  const openEditDialog = (client: Client) => {
    setClientToEdit(client);
    editForm.reset({
        ...client,
        kycCompletedDate: client.kycCompletedDate
    });
    setEditOpen(true);
  }
  
  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setDeleteAlertOpen(true);
  }

  const handleSelectAll = (checked: boolean) => {
    if(checked) {
        setSelectedClients(paginatedClients.map(c => c.id));
    } else {
        setSelectedClients([]);
    }
  }

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if(checked) {
        setSelectedClients(prev => [...prev, clientId]);
    } else {
        setSelectedClients(prev => prev.filter(id => id !== clientId));
    }
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
                <FormField control={form.control} name="shopId" render={({ field }) => (
                    <FormItem><FormLabel>Shop ID</FormLabel><FormControl><Input placeholder="Enter Shop ID" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="clientName" render={({ field }) => (
                    <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="agent" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Agent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {agents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="kycCompletedDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>KYC Completed Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                      </FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                        <SelectContent>{clientStatus.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="clientDetails" render={({ field }) => (
                    <FormItem><FormLabel>Client Details</FormLabel><FormControl><Textarea placeholder="Enter client details..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <DialogFooter><Button type="submit">Add Client</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      {clients.length > 0 ? (
        <>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox"><Checkbox onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={selectedClients.length === paginatedClients.length && paginatedClients.length > 0}/></TableHead>
                <TableHead>Shop ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>KYC Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.id} data-state={selectedClients.includes(client.id) && "selected"}>
                  <TableCell padding="checkbox"><Checkbox onCheckedChange={(checked) => handleSelectClient(client.id, Boolean(checked))} checked={selectedClients.includes(client.id)}/></TableCell>
                  <TableCell>{client.shopId}</TableCell>
                  <TableCell>{client.clientName}</TableCell>
                  <TableCell>{client.agent}</TableCell>
                  <TableCell>{format(client.kycCompletedDate, "PPP")}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'Active' ? 'default' : client.status === 'In Process' ? 'secondary' : 'destructive'}>{client.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{client.clientDetails}</TableCell>
                  <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(client)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteDialog(client)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
                {selectedClients.length} of {clients.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
        </div>
        </>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">No Clients Added</h2>
            <p className="text-muted-foreground mt-2">Add a new client to see their details here.</p>
          </div>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
                <DialogDescription>
                    Update the details for {clientToEdit?.clientName}.
                </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField control={editForm.control} name="shopId" render={({ field }) => (
                        <FormItem><FormLabel>Shop ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="clientName" render={({ field }) => (
                        <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="agent" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>{agents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={editForm.control} name="kycCompletedDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>KYC Completed Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                          </PopoverContent>
                        </Popover><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="status" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{clientStatus.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="clientDetails" render={({ field }) => (
                        <FormItem><FormLabel>Client Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>

    {/* Delete Dialog */}
    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the client record for {clientToDelete?.clientName}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteClient}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  )
}

export default withAuth(ClientDetailsPage);
