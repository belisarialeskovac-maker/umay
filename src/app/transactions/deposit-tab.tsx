
"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, getMonth, getYear, parseISO, isValid } from "date-fns"
import { CalendarIcon, Loader2, MoreHorizontal, Edit, Trash2, Search, Upload } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useData } from "@/context/data-context"
import { useAuth } from "@/context/auth-context"
import type { Deposit } from "@/context/data-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useDebounce } from '@/hooks/use-debounce';

const paymentModes = ["Ewallet/Online Banking", "Crypto"] as const

const formSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required."),
  clientName: z.string().min(2, "Client name must be at least 2 characters."),
  agent: z.string().min(1, "An agent is required."),
  date: z.date({
    required_error: "A date is required.",
  }),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  paymentMode: z.enum(paymentModes),
})

type PreviewRow = {
    data: any;
    status: 'Ready to Import' | 'Invalid Data';
    reason?: string;
}


const DEPOSITS_PER_PAGE = 20;

export default function DepositTab() {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  const [depositToEdit, setDepositToEdit] = useState<Deposit | null>(null);
  const [depositToDelete, setDepositToDelete] = useState<Deposit | null>(null);
  const [bulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false);
  const [selectedDeposits, setSelectedDeposits] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  
  const { deposits: allDeposits, clients, agents, loading: dataLoading } = useData();
  const { user } = useAuth();
  const { toast } = useToast()

  const deposits = useMemo(() => {
    if (!user || dataLoading) return [];
    if (user.role === 'Admin' || user.role === 'Superadmin') {
      return allDeposits;
    }
    return allDeposits.filter(d => d.agent === user.name);
  }, [allDeposits, user, dataLoading]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopId: "",
      clientName: "",
      agent: "",
      paymentMode: "Ewallet/Online Banking",
      amount: 0,
      date: new Date(),
    },
  })
  
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema)
  });

  const displayAgents = useMemo(() => agents.filter(agent => agent.role !== 'Superadmin'), [agents]);
  
  const filteredDeposits = useMemo(() => {
    let sortedDeposits = [...deposits].sort((a,b) => b.date.getTime() - a.date.getTime());
    return sortedDeposits.filter(deposit => {
        const lowercasedTerm = debouncedSearch.toLowerCase();
        const matchesSearch = debouncedSearch.trim() === '' ||
            deposit.shopId.toLowerCase().includes(lowercasedTerm) ||
            deposit.clientName.toLowerCase().includes(lowercasedTerm) ||
            deposit.agent.toLowerCase().includes(lowercasedTerm) ||
            deposit.paymentMode.toLowerCase().includes(lowercasedTerm) ||
            String(deposit.amount).includes(lowercasedTerm);

        const matchesAgent = agentFilter === 'all' || deposit.agent === agentFilter;
        
        const depositDate = deposit.date;
        const matchesMonth = monthFilter === 'all' || getMonth(depositDate) === parseInt(monthFilter);
        const matchesYear = yearFilter === 'all' || getYear(depositDate) === parseInt(yearFilter);

        return matchesSearch && matchesAgent && matchesMonth && matchesYear;
    });
  }, [deposits, debouncedSearch, agentFilter, monthFilter, yearFilter]);

  const paginatedDeposits = useMemo(() => {
    const startIndex = (currentPage - 1) * DEPOSITS_PER_PAGE;
    const endIndex = startIndex + DEPOSITS_PER_PAGE;
    return filteredDeposits.slice(startIndex, endIndex);
  }, [filteredDeposits, currentPage]);
  
  const totalPages = Math.ceil(filteredDeposits.length / DEPOSITS_PER_PAGE);

  useEffect(() => {
    setSelectedDeposits([]);
  }, [currentPage, agentFilter, monthFilter, yearFilter, debouncedSearch]);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setAgentFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    setCurrentPage(1);
  }, []);

  const watchedShopId = form.watch("shopId");
  const watchedEditShopId = editForm.watch("shopId");

  useEffect(() => {
    if (watchedShopId) {
      const client = clients.find(c => c.shopId === watchedShopId);
      if (client) {
        form.setValue("clientName", client.clientName);
        form.setValue("agent", client.agent);
      } else {
        form.setValue("clientName", "");
        form.setValue("agent", "");
      }
    }
  }, [watchedShopId, clients, form]);
  
  useEffect(() => {
    if (watchedEditShopId && depositToEdit) {
      const client = clients.find(c => c.shopId === watchedEditShopId);
      if (client) {
        editForm.setValue("clientName", client.clientName);
        editForm.setValue("agent", client.agent);
      } else {
        editForm.setValue("clientName", "");
        editForm.setValue("agent", "");
      }
    }
  }, [watchedEditShopId, clients, editForm, depositToEdit]);

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    try {
      await addDoc(collection(db, "deposits"), values);
      toast({
        title: "Deposit Added",
        description: `Successfully added deposit for ${values.clientName}.`,
      })
      setOpen(false)
      form.reset({
          shopId: "",
          clientName: "",
          agent: "",
          paymentMode: "Ewallet/Online Banking",
          amount: 0,
          date: new Date(),
      })
    } catch(error) {
      console.error("Error adding deposit: ", error);
      toast({
        title: "Error",
        description: "Failed to add deposit.",
        variant: "destructive"
      });
    }
  }, [form, toast]);

  const onEditSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    if (!depositToEdit) return;
    try {
        const depositRef = doc(db, "deposits", depositToEdit.id);
        await updateDoc(depositRef, values);
        toast({ title: "Deposit Updated", description: "Deposit details have been updated." });
        setEditOpen(false);
    } catch(error: any) {
        toast({ title: "Error", description: error.message || "Failed to update deposit.", variant: "destructive" });
    }
  }, [depositToEdit, toast]);

  const handleDeleteDeposit = useCallback(async () => {
    if (!depositToDelete) return;
    try {
        await deleteDoc(doc(db, "deposits", depositToDelete.id));
        toast({
            title: "Deposit Deleted",
            description: `Deposit for ${depositToDelete.clientName} has been removed.`,
            variant: "destructive"
        })
    } catch (error: any) {
         toast({ title: "Error", description: error.message || "Failed to delete deposit.", variant: "destructive" });
    }
    setDeleteAlertOpen(false);
    setDepositToDelete(null);
  }, [depositToDelete, toast]);

  const handleBulkDelete = useCallback(async () => {
    const batch = writeBatch(db);
    selectedDeposits.forEach(id => {
      batch.delete(doc(db, "deposits", id));
    });
    try {
      await batch.commit();
      toast({ title: "Deposits Deleted", description: `${selectedDeposits.length} deposits have been deleted.` });
      setSelectedDeposits([]);
    } catch(error: any) {
      toast({ title: "Error", description: "Failed to delete selected deposits.", variant: "destructive" });
    }
    setBulkDeleteAlertOpen(false);
  }, [selectedDeposits, toast]);

  const handleCsvUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        complete: (results) => {
            const requiredHeaders = ["shopid", "agent", "date", "amount", "payment"];
            const fileHeaders = results.meta.fields || [];

            const lowercasedFileHeaders = fileHeaders.map(h => h.toLowerCase());
            if (!requiredHeaders.every(h => lowercasedFileHeaders.includes(h))) {
                toast({
                    title: "Invalid CSV Format",
                    description: `CSV must contain headers: ${requiredHeaders.join(', ')}`,
                    variant: "destructive"
                });
                return;
            }

            const clientsMap = new Map(clients.map(c => [c.shopId.toLowerCase(), c]));
            const agentNamesSet = new Set(agents.map(a => a.name.toLowerCase()));
            
            const validatedData = results.data.map((row: any) => {
                const getRowValue = (key: string) => {
                    const actualHeader = fileHeaders.find(h => h.toLowerCase() === key.toLowerCase());
                    return actualHeader ? row[actualHeader] : undefined;
                };

                const shopId = getRowValue('shopid');
                const client = clientsMap.get(shopId?.toLowerCase());
                
                if (!client) {
                    return { data: row, status: 'Invalid Data' as const, reason: 'Shop ID not found.' };
                }

                const agentName = getRowValue('agent');
                if (!agentName || !agentNamesSet.has(agentName.toLowerCase())) {
                    return { data: row, status: 'Invalid Data' as const, reason: `Agent '${agentName}' not found.` };
                }
                
                const dateString = getRowValue('date');
                const dateRegex = /(\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2})/;
                const dateMatch = dateString?.match(dateRegex);
                const transactionDate = dateMatch ? new Date(dateMatch[0]) : new Date(dateString);
                
                if (!isValid(transactionDate)) {
                    return { data: row, status: 'Invalid Data' as const, reason: 'Invalid date format.' };
                }
                
                let paymentMode = getRowValue('payment');
                if (['ewallet', 'online banking'].includes(paymentMode.toLowerCase())) {
                    paymentMode = 'Ewallet/Online Banking';
                } else if (paymentMode.toLowerCase() !== 'crypto') {
                    return { data: row, status: 'Invalid Data' as const, reason: 'Invalid payment mode. Use Ewallet, Online Banking, or Crypto.' };
                }
                
                const amount = parseFloat(getRowValue('amount'));
                if (isNaN(amount) || amount <= 0) {
                     return { data: row, status: 'Invalid Data' as const, reason: 'Amount must be a positive number.' };
                }

                const finalData = {
                    shopId: client.shopId,
                    clientName: client.clientName,
                    agent: agentName,
                    date: transactionDate,
                    amount: amount,
                    paymentMode: paymentMode
                };

                return { data: finalData, status: 'Ready to Import' as const };
            });

            setPreviewData(validatedData);
            setPreviewDialogOpen(true);
        },
        error: (error) => {
            toast({ title: "CSV Parsing Error", description: error.message, variant: "destructive" });
        }
    });

    if(csvInputRef.current) {
        csvInputRef.current.value = "";
    }
  }, [clients, agents, toast]);


  const handleConfirmImport = useCallback(async () => {
    setIsImporting(true);
    const batch = writeBatch(db);
    let importedCount = 0;
    
    previewData.forEach(row => {
        if(row.status === 'Ready to Import') {
            const depositRef = doc(collection(db, "deposits"));
            batch.set(depositRef, row.data);
            importedCount++;
        }
    });

    if (importedCount === 0) {
        toast({ title: "No Deposits to Import", description: "There are no valid new deposits to import.", variant: "destructive"});
        setIsImporting(false);
        setPreviewDialogOpen(false);
        return;
    }

    try {
        await batch.commit();
        toast({
            title: "Import Complete",
            description: `${importedCount} deposits imported successfully.`,
        });
        resetFilters();
    } catch (error) {
        toast({ title: "Import Error", description: "An error occurred during the batch import.", variant: "destructive" });
    } finally {
        setIsImporting(false);
        setPreviewDialogOpen(false);
        setPreviewData([]);
    }
  }, [previewData, toast, resetFilters]);
  
  const openEditDialog = useCallback((deposit: Deposit) => {
    setDepositToEdit(deposit);
    editForm.reset({
        ...deposit,
        date: deposit.date
    });
    setEditOpen(true);
  }, [editForm]);
  
  const openDeleteDialog = useCallback((deposit: Deposit) => {
    setDepositToDelete(deposit);
    setDeleteAlertOpen(true);
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedDeposits(checked ? paginatedDeposits.map(d => d.id) : []);
  }, [paginatedDeposits]);

  const handleSelectDeposit = useCallback((depositId: string, checked: boolean) => {
    setSelectedDeposits(prev => checked ? [...prev, depositId] : prev.filter(id => id !== depositId));
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(deposits.map(d => getYear(d.date)));
    return Array.from(years).sort((a,b) => b - a);
  }, [deposits]);
  
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  })), []);

  const clientFound = !!watchedShopId && clients.some(c => c.shopId === watchedShopId);
  const clientFoundEdit = !!watchedEditShopId && clients.some(c => c.shopId === watchedEditShopId);
  const canManage = user?.role === 'Admin' || user?.role === 'Superadmin';
  const readyToImportCount = useMemo(() => previewData.filter(row => row.status === 'Ready to Import').length, [previewData]);
  const hasInvalidRows = useMemo(() => previewData.some(row => row.status === 'Invalid Data'), [previewData]);

  const isAllOnPageSelected = paginatedDeposits.length > 0 && selectedDeposits.length === paginatedDeposits.length;


  if (dataLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-end mb-6 gap-2">
        {canManage && (
            <>
            <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
            </Button>
            <input type="file" ref={csvInputRef} accept=".csv" onChange={handleCsvUpload} className="hidden" />
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add New Deposit</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Add New Deposit</DialogTitle>
                <DialogDescription>
                    Fill in the details below to add a new deposit.
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
                            <Input placeholder="Client Name (auto-filled)" {...field} disabled={clientFound} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField control={form.control} name="agent" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <FormControl>
                            <Input placeholder="Agent (auto-filled)" {...field} disabled={clientFound} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
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
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="paymentMode"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Payment Mode</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Ewallet/Online Banking" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                E-wallet/Online Banking
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Crypto" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Crypto
                                </FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                    <Button type="submit">Add Deposit</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
            </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search deposits..." className="pl-10" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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

       {canManage && selectedDeposits.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-lg text-sm">
             {selectedDeposits.length === filteredDeposits.length ? (
                <>
                <p className="font-medium">All {selectedDeposits.length} deposit(s) selected.</p>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedDeposits([])}>Clear selection</Button>
                </>
             ) : (
                <>
                <p className="font-medium">{selectedDeposits.length} deposit(s) on this page selected.</p>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedDeposits(filteredDeposits.map(d => d.id))}>Select all {filteredDeposits.length} deposits</Button>
                </>
             )}
            <Button size="sm" variant="destructive" className="ml-auto" onClick={() => setBulkDeleteAlertOpen(true)}>Delete Selected</Button>
        </div>
      )}

      {paginatedDeposits.length > 0 ? (
        <>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && <TableHead><Checkbox onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={isAllOnPageSelected} aria-label="Select all rows on this page" /></TableHead>}
                <TableHead>Shop ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeposits.map((deposit) => (
                <TableRow key={deposit.id} data-state={selectedDeposits.includes(deposit.id) && "selected"}>
                   {canManage && <TableCell><Checkbox onCheckedChange={(checked) => handleSelectDeposit(deposit.id, Boolean(checked))} checked={selectedDeposits.includes(deposit.id)} aria-label={`Select row for ${deposit.clientName}`} /></TableCell>}
                  <TableCell>{deposit.shopId}</TableCell>
                  <TableCell>{deposit.clientName}</TableCell>
                  <TableCell>{deposit.agent}</TableCell>
                  <TableCell>{format(deposit.date, "PPP")}</TableCell>
                  <TableCell>${deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>{deposit.paymentMode}</TableCell>
                  {canManage && (
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(deposit)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteDialog(deposit)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                Showing {paginatedDeposits.length} of {filteredDeposits.length} deposit(s).
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
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              No Deposits Found
            </h2>
            <p className="text-muted-foreground mt-2">
              Try adjusting your search or filters.
            </p>
          </div>
        </div>
      )}

    {/* Edit Dialog */}
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Deposit</DialogTitle>
                <DialogDescription>
                    Update the details for this deposit record.
                </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField control={editForm.control} name="shopId" render={({ field }) => (
                        <FormItem><FormLabel>Shop ID</FormLabel><FormControl><Input placeholder="Enter Shop ID" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="clientName" render={({ field }) => (
                        <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="Client Name (auto-filled)" {...field} disabled={clientFoundEdit} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="agent" render={({ field }) => (
                        <FormItem><FormLabel>Agent</FormLabel><FormControl><Input placeholder="Agent (auto-filled)" {...field} disabled={clientFoundEdit} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                        </Popover><FormMessage /></FormItem>
                     )} />
                    <FormField control={editForm.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="paymentMode" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Payment Mode</FormLabel>
                        <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Ewallet/Online Banking" /></FormControl>
                                <FormLabel className="font-normal">E-wallet/Online Banking</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="Crypto" /></FormControl>
                                <FormLabel className="font-normal">Crypto</FormLabel>
                            </FormItem>
                        </RadioGroup></FormControl><FormMessage /></FormItem>
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
                    This action cannot be undone. This will permanently delete this deposit record.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDeposit}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    {/* Bulk Delete Dialog */}
     <AlertDialog open={bulkDeleteAlertOpen} onOpenChange={setBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected {selectedDeposits.length} deposit records.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

     {/* CSV Preview Dialog */}
    <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>CSV Import Preview</DialogTitle>
                <DialogDescription>
                    Review the data to be imported. Invalid rows are automatically excluded.
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
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Payment</TableHead>
                            {hasInvalidRows && <TableHead>Reason</TableHead>}
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
                                <TableCell>{row.data.shopId || row.data.shopid}</TableCell>
                                <TableCell>{row.data.clientName}</TableCell>
                                <TableCell>{row.data.agent}</TableCell>
                                <TableCell>{row.data.date ? format(new Date(row.data.date), "PPP") : 'Invalid'}</TableCell>
                                <TableCell>${Number(row.data.amount || 0).toFixed(2)}</TableCell>
                                <TableCell>{row.data.paymentMode || row.data.payment}</TableCell>
                                {hasInvalidRows && <TableCell>{row.reason || 'N/A'}</TableCell>}
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
