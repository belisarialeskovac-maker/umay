
"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, getMonth, getYear, parseISO, isValid } from "date-fns"
import { CalendarIcon, Loader2, MoreHorizontal, Edit, Trash2, Search, Upload } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch, query, where, getDocs } from "firebase/firestore";
import Papa from "papaparse";

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
import { useAuth } from "@/context/auth-context"
import withAuth from "@/components/with-auth"
import type { Client } from "@/context/data-context"
import { ScrollArea } from "@/components/ui/scroll-area"

const clientStatus = ["In Process", "Active", "Inactive", "Eliminated"] as const;

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
type PreviewRow = {
    data: any;
    status: 'Ready to Import' | 'Duplicate ID' | 'Invalid Data';
    reason?: string;
}


const CLIENTS_PER_PAGE = 20;

function ShopDetailsPage() {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [bulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false)
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [newBulkStatus, setNewBulkStatus] = useState<typeof clientStatus[number] | ''>('');

  const csvInputRef = useRef<HTMLInputElement>(null);


  const { clients: allClients, agents, loading: dataLoading } = useData();
  const { user } = useAuth();
  const { toast } = useToast()

  const userVisibleClients = useMemo(() => {
    if (!user || dataLoading) return [];
    if (user.role === 'Admin' || user.role === 'Superadmin') {
      return allClients;
    }
    return allClients.filter(c => c.agent === user.name);
  }, [allClients, user, dataLoading]);

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

  const displayAgents = useMemo(() => agents.filter(agent => agent.role !== 'Superadmin'), [agents]);
  
  const filteredClients = useMemo(() => {
    return userVisibleClients.filter(client => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = searchTerm.trim() === '' ||
            client.shopId.toLowerCase().includes(lowercasedTerm) ||
            client.clientName.toLowerCase().includes(lowercasedTerm) ||
            client.agent.toLowerCase().includes(lowercasedTerm) ||
            client.status.toLowerCase().includes(lowercasedTerm) ||
            client.clientDetails.toLowerCase().includes(lowercasedTerm);

        const matchesAgent = agentFilter === 'all' || client.agent === agentFilter;
        
        const clientDate = client.kycCompletedDate;
        const matchesMonth = monthFilter === 'all' || getMonth(clientDate) === parseInt(monthFilter);
        const matchesYear = yearFilter === 'all' || getYear(clientDate) === parseInt(yearFilter);

        return matchesSearch && matchesAgent && matchesMonth && matchesYear;
    });
  }, [userVisibleClients, searchTerm, agentFilter, monthFilter, yearFilter]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
    const endIndex = startIndex + CLIENTS_PER_PAGE;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage]);
  
  const totalPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter change
    setSelectedClients([]); // Clear selections on filter change
  }, [searchTerm, agentFilter, monthFilter, yearFilter]);

  const onSubmit = useCallback(async (values: ClientFormData) => {
    try {
      // Check for unique shopId
      const q = query(collection(db, "clients"), where("shopId", "==", values.shopId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({
            title: "Error",
            description: "This Shop ID is already in use. Please choose another.",
            variant: "destructive",
        });
        return;
      }

      await addDoc(collection(db, "clients"), values);
      toast({
        title: "Shop Added",
        description: `Successfully added ${values.clientName}.`,
      })
      setOpen(false)
      form.reset()
    } catch(error) {
      console.error("Error adding client: ", error);
      toast({
        title: "Error",
        description: "Failed to add shop.",
        variant: "destructive"
      });
    }
  }, [form, toast]);

  const onEditSubmit = useCallback(async (values: ClientFormData) => {
    if (!clientToEdit) return;
    try {
        // Check for unique shopId if it has changed
        if (values.shopId !== clientToEdit.shopId) {
            const q = query(collection(db, "clients"), where("shopId", "==", values.shopId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({
                    title: "Error",
                    description: "This Shop ID is already in use by another shop.",
                    variant: "destructive",
                });
                return;
            }
        }
        const clientRef = doc(db, "clients", clientToEdit.id);
        await updateDoc(clientRef, values);
        toast({ title: "Shop Updated", description: "Shop details have been updated." });
        setEditOpen(false);
    } catch(error: any) {
        toast({ title: "Error", description: error.message || "Failed to update shop.", variant: "destructive" });
    }
  }, [clientToEdit, toast]);

  const handleDeleteClient = useCallback(async () => {
    if (!clientToDelete) return;
    try {
        await deleteDoc(doc(db, "clients", clientToDelete.id));
        toast({
            title: "Shop Deleted",
            description: `${clientToDelete.clientName} has been removed from the database.`,
            variant: "destructive"
        })
    } catch (error: any) {
         toast({ title: "Error", description: error.message || "Failed to delete shop.", variant: "destructive" });
    }
    setDeleteAlertOpen(false);
    setClientToDelete(null);
  }, [clientToDelete, toast]);

  const handleBulkDelete = useCallback(async () => {
    const batch = writeBatch(db);
    selectedClients.forEach(id => {
      batch.delete(doc(db, "clients", id));
    });
    try {
      await batch.commit();
      toast({ title: "Shops Deleted", description: `${selectedClients.length} shops have been deleted.` });
      setSelectedClients([]);
    } catch(error: any) {
      toast({ title: "Error", description: "Failed to delete selected shops.", variant: "destructive" });
    }
    setBulkDeleteAlertOpen(false);
  }, [selectedClients, toast]);
  
  const handleBulkStatusChange = useCallback(async () => {
    if (!newBulkStatus) {
      toast({ title: "No Status Selected", description: "Please select a status to apply.", variant: "destructive" });
      return;
    }
    const batch = writeBatch(db);
    selectedClients.forEach(id => {
      batch.update(doc(db, "clients", id), { status: newBulkStatus });
    });
     try {
      await batch.commit();
      toast({ title: "Status Updated", description: `Status for ${selectedClients.length} shops has been updated to ${newBulkStatus}.` });
      setSelectedClients([]);
    } catch(error: any) {
      toast({ title: "Error", description: "Failed to update shop statuses.", variant: "destructive" });
    }
    setBulkStatusDialogOpen(false);
    setNewBulkStatus('');
  }, [selectedClients, newBulkStatus, toast]);

  const handleCsvUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const requiredHeaders = ["shopId", "clientName", "agent", "kycCompletedDate", "status"];
            const headers = results.meta.fields || [];

            if (!requiredHeaders.every(h => headers.includes(h))) {
                toast({
                    title: "Invalid CSV Format",
                    description: `CSV must contain the headers: ${requiredHeaders.join(', ')}`,
                    variant: "destructive"
                });
                return;
            }

            const clientsData = results.data as any[];
            const existingShopIds = new Set(allClients.map(c => c.shopId));
            
            const validatedData = clientsData.map(row => {
                if (existingShopIds.has(row.shopId)) {
                    return { data: row, status: 'Duplicate ID', reason: 'Shop ID already exists.' };
                }
                
                let kycDate = new Date(row.kycCompletedDate);
                if (!isValid(kycDate)) {
                    kycDate = parseISO(row.kycCompletedDate);
                }

                if (!isValid(kycDate)) {
                    return { data: row, status: 'Invalid Data', reason: 'Invalid date format for kycCompletedDate.' };
                }
                if (!clientStatus.includes(row.status)) {
                    return { data: row, status: 'Invalid Data', reason: `Status must be one of: ${clientStatus.join(', ')}` };
                }

                return { data: { ...row, kycCompletedDate: kycDate, clientDetails: row.clientDetails || '' }, status: 'Ready to Import' };
            });

            setPreviewData(validatedData);
            setPreviewDialogOpen(true);
        },
        error: (error) => {
            toast({
                title: "CSV Parsing Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    if(csvInputRef.current) {
        csvInputRef.current.value = "";
    }
  }, [allClients, toast, agents]);

  const handleConfirmImport = useCallback(async () => {
    setIsImporting(true);
    const batch = writeBatch(db);
    let importedCount = 0;
    
    previewData.forEach(row => {
        if(row.status === 'Ready to Import') {
            const clientRef = doc(collection(db, "clients"));
            batch.set(clientRef, row.data);
            importedCount++;
        }
    });

    if (importedCount === 0) {
        toast({ title: "No Shops to Import", description: "There are no valid new shops to import.", variant: "destructive"});
        setIsImporting(false);
        setPreviewDialogOpen(false);
        return;
    }

    try {
        await batch.commit();
        toast({
            title: "Import Complete",
            description: `${importedCount} shops imported successfully.`,
        });
    } catch (error) {
        toast({
            title: "Import Error",
            description: "An error occurred during the batch import.",
            variant: "destructive"
        });
    } finally {
        setIsImporting(false);
        setPreviewDialogOpen(false);
        setPreviewData([]);
    }
  }, [previewData, toast]);


  const openEditDialog = useCallback((client: Client) => {
    setClientToEdit(client);
    editForm.reset({
        ...client,
        kycCompletedDate: client.kycCompletedDate
    });
    setEditOpen(true);
  }, [editForm]);
  
  const openDeleteDialog = useCallback((client: Client) => {
    setClientToDelete(client);
    setDeleteAlertOpen(true);
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if(checked) {
        setSelectedClients(paginatedClients.map(c => c.id));
    } else {
        setSelectedClients([]);
    }
  }, [paginatedClients]);

  const handleSelectClient = useCallback((clientId: string, checked: boolean) => {
    if(checked) {
        setSelectedClients(prev => [...prev, clientId]);
    } else {
        setSelectedClients(prev => prev.filter(id => id !== clientId));
    }
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(userVisibleClients.map(c => getYear(c.kycCompletedDate)));
    return Array.from(years).sort((a,b) => b - a);
  }, [userVisibleClients]);
  
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  })), []);

  const canManage = user?.role === 'Admin' || user?.role === 'Superadmin';
  const readyToImportCount = useMemo(() => previewData.filter(row => row.status === 'Ready to Import').length, [previewData]);

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
          <h1 className="text-3xl font-bold text-foreground">Shop Details</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client information.
          </p>
        </div>
        {canManage && (
            <div className="flex items-center gap-2">
                 <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                </Button>
                <input
                    type="file"
                    ref={csvInputRef}
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                />
                <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>Add New Shop</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Add New Shop</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to add a new shop.
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
                                {displayAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}
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
                        <DialogFooter><Button type="submit">Add Shop</Button></DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
                </Dialog>
            </div>
        )}
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search shops..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {canManage && (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by agent" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {displayAgents.map(agent => (<SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>))}
                </SelectContent>
            </Select>
        )}
        <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by month" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}
            </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Filter by year" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
            </SelectContent>
        </Select>
      </div>
      
      {canManage && selectedClients.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{selectedClients.length} shop(s) selected.</p>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteAlertOpen(true)}>Delete Selected</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkStatusDialogOpen(true)}>Change Status</Button>
        </div>
      )}


      {paginatedClients.length > 0 ? (
        <>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && <TableHead padding="checkbox"><Checkbox onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={selectedClients.length === paginatedClients.length && paginatedClients.length > 0}/></TableHead>}
                <TableHead>Shop ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>KYC Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.id} data-state={selectedClients.includes(client.id) && "selected"}>
                  {canManage && <TableCell padding="checkbox"><Checkbox onCheckedChange={(checked) => handleSelectClient(client.id, Boolean(checked))} checked={selectedClients.includes(client.id)}/></TableCell>}
                  <TableCell>{client.shopId}</TableCell>
                  <TableCell>{client.clientName}</TableCell>
                  <TableCell>{client.agent}</TableCell>
                  <TableCell>{format(client.kycCompletedDate, "PPP")}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'Active' ? 'default' : client.status === 'In Process' || client.status === 'Inactive' ? 'secondary' : 'destructive'}>{client.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{client.clientDetails}</TableCell>
                  {canManage && (
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
                Showing {paginatedClients.length} of {filteredClients.length} shop(s).
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
            <h2 className="text-2xl font-bold tracking-tight text-foreground">No Shops Found</h2>
            <p className="text-muted-foreground mt-2">{user?.role === 'Agent' ? "You have not been assigned any shops." : "Try adjusting your search or filters."}</p>
          </div>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Shop</DialogTitle>
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
                            <SelectContent>{displayAgents.map(agent => <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>)}</SelectContent>
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

    {/* Single Delete Dialog */}
    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the shop record for {clientToDelete?.clientName}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteClient}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    {/* Bulk Delete Dialog */}
     <AlertDialog open={bulkDeleteAlertOpen} onOpenChange={setBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected {selectedClients.length} shop records.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {/* Bulk Status Change Dialog */}
    <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Status for Selected Shops</DialogTitle>
                <DialogDescription>Select a new status to apply to the {selectedClients.length} selected shops.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select value={newBulkStatus} onValueChange={(value: typeof clientStatus[number]) => setNewBulkStatus(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select new status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clientStatus.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setBulkStatusDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleBulkStatusChange} disabled={!newBulkStatus}>Apply Status</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* CSV Preview Dialog */}
    <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>CSV Import Preview</DialogTitle>
                <DialogDescription>
                    Review the data to be imported. Duplicates and rows with errors are automatically excluded.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Shop ID</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {previewData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Badge variant={row.status === 'Ready to Import' ? 'default' : 'destructive'}>
                                        {row.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{row.data.shopId}</TableCell>
                                <TableCell>{row.data.clientName}</TableCell>
                                <TableCell>{row.data.agent}</TableCell>
                                <TableCell>{row.reason || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setPreviewDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={isImporting || readyToImportCount === 0}>
                    {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Importing...</> : `Confirm Import (${readyToImportCount})`}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </div>
  )
}

export default withAuth(ShopDetailsPage, ['Agent', 'Admin', 'Superadmin']);
