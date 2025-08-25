
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, getMonth, getYear } from "date-fns"
import { CalendarIcon, Loader2, MoreHorizontal, Edit, Trash2, Search } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import type { Withdrawal } from "@/context/data-context"

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

const WITHDRAWALS_PER_PAGE = 20;

export default function WithdrawalTab() {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  const [withdrawalToEdit, setWithdrawalToEdit] = useState<Withdrawal | null>(null);
  const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const { withdrawals: allWithdrawals, clients, agents, loading: dataLoading } = useData();
  const { user } = useAuth();
  const { toast } = useToast()

  const withdrawals = useMemo(() => {
    if (!user || dataLoading) return [];
    if (user.role === 'Admin' || user.role === 'Superadmin') {
      return allWithdrawals;
    }
    return allWithdrawals.filter(w => w.agent === user.name);
  }, [allWithdrawals, user, dataLoading]);

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
  
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(withdrawal => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = searchTerm.trim() === '' ||
            withdrawal.shopId.toLowerCase().includes(lowercasedTerm) ||
            withdrawal.clientName.toLowerCase().includes(lowercasedTerm) ||
            withdrawal.agent.toLowerCase().includes(lowercasedTerm) ||
            withdrawal.paymentMode.toLowerCase().includes(lowercasedTerm) ||
            String(withdrawal.amount).includes(lowercasedTerm);

        const matchesAgent = agentFilter === 'all' || withdrawal.agent === agentFilter;
        
        const withdrawalDate = withdrawal.date;
        const matchesMonth = monthFilter === 'all' || getMonth(withdrawalDate) === parseInt(monthFilter);
        const matchesYear = yearFilter === 'all' || getYear(withdrawalDate) === parseInt(yearFilter);

        return matchesSearch && matchesAgent && matchesMonth && matchesYear;
    });
  }, [withdrawals, searchTerm, agentFilter, monthFilter, yearFilter]);

  const paginatedWithdrawals = useMemo(() => {
    const startIndex = (currentPage - 1) * WITHDRAWALS_PER_PAGE;
    const endIndex = startIndex + WITHDRAWALS_PER_PAGE;
    return filteredWithdrawals.slice(startIndex, endIndex);
  }, [filteredWithdrawals, currentPage]);
  
  const totalPages = Math.ceil(filteredWithdrawals.length / WITHDRAWALS_PER_PAGE);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
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
    if (watchedEditShopId && withdrawalToEdit) {
      const client = clients.find(c => c.shopId === watchedEditShopId);
      if (client) {
        editForm.setValue("clientName", client.clientName);
        editForm.setValue("agent", client.agent);
      } else {
        editForm.setValue("clientName", "");
        editForm.setValue("agent", "");
      }
    }
  }, [watchedEditShopId, clients, editForm, withdrawalToEdit]);

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    try {
      await addDoc(collection(db, "withdrawals"), values);
      toast({
        title: "Withdrawal Added",
        description: `Successfully added withdrawal for ${values.clientName}.`,
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
      console.error("Error adding withdrawal: ", error);
      toast({
        title: "Error",
        description: "Failed to add withdrawal.",
        variant: "destructive"
      });
    }
  }, [form, toast]);
  
  const onEditSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    if (!withdrawalToEdit) return;
    try {
        const withdrawalRef = doc(db, "withdrawals", withdrawalToEdit.id);
        await updateDoc(withdrawalRef, values);
        toast({ title: "Withdrawal Updated", description: "Withdrawal details have been updated." });
        setEditOpen(false);
    } catch(error: any) {
        toast({ title: "Error", description: error.message || "Failed to update withdrawal.", variant: "destructive" });
    }
  }, [withdrawalToEdit, toast]);

  const handleDeleteWithdrawal = useCallback(async () => {
    if (!withdrawalToDelete) return;
    try {
        await deleteDoc(doc(db, "withdrawals", withdrawalToDelete.id));
        toast({
            title: "Withdrawal Deleted",
            description: `Withdrawal for ${withdrawalToDelete.clientName} has been removed.`,
            variant: "destructive"
        })
    } catch (error: any) {
         toast({ title: "Error", description: error.message || "Failed to delete withdrawal.", variant: "destructive" });
    }
    setDeleteAlertOpen(false);
    setWithdrawalToDelete(null);
  }, [withdrawalToDelete, toast]);
  
  const openEditDialog = useCallback((withdrawal: Withdrawal) => {
    setWithdrawalToEdit(withdrawal);
    editForm.reset({
        ...withdrawal,
        date: withdrawal.date
    });
    setEditOpen(true);
  }, [editForm]);
  
  const openDeleteDialog = useCallback((withdrawal: Withdrawal) => {
    setWithdrawalToDelete(withdrawal);
    setDeleteAlertOpen(true);
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(withdrawals.map(w => getYear(w.date)));
    return Array.from(years).sort((a,b) => b - a);
  }, [withdrawals]);
  
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  })), []);

  const clientFound = !!watchedShopId && clients.some(c => c.shopId === watchedShopId);
  const clientFoundEdit = !!watchedEditShopId && clients.some(c => c.shopId === watchedEditShopId);
  const canManage = user?.role === 'Admin' || user?.role === 'Superadmin';

  if (dataLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-end mb-6">
        {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add New Withdrawal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Add New Withdrawal</DialogTitle>
                <DialogDescription>
                    Fill in the details below to add a new withdrawal.
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
                            <Input placeholder="Client Name (auto-filled)" {...field} disabled={clientFound}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField control={form.control} name="agent" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <FormControl>
                            <Input placeholder="Agent (auto-filled)" {...field} disabled={clientFound}/>
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
                    <Button type="submit">Add Withdrawal</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        )}
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search withdrawals..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

      {paginatedWithdrawals.length > 0 ? (
        <>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
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
              {paginatedWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>{withdrawal.shopId}</TableCell>
                  <TableCell>{withdrawal.clientName}</TableCell>
                  <TableCell>{withdrawal.agent}</TableCell>
                  <TableCell>{format(withdrawal.date, "PPP")}</TableCell>
                  <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                  <TableCell>{withdrawal.paymentMode}</TableCell>
                   {canManage && (
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(withdrawal)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteDialog(withdrawal)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                Showing {paginatedWithdrawals.length} of {filteredWithdrawals.length} withdrawal(s).
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
              No Withdrawals Found
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
                <DialogTitle>Edit Withdrawal</DialogTitle>
                <DialogDescription>
                    Update the details for this withdrawal record.
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
                    This action cannot be undone. This will permanently delete this withdrawal record.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteWithdrawal}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  )
}
