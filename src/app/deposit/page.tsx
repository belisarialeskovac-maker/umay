
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useData } from "@/context/data-context"
import withAuth from "@/components/with-auth"
import type { Deposit } from "@/context/data-context"

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

const DEPOSITS_PER_PAGE = 20;

function DepositPage() {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const [depositToEdit, setDepositToEdit] = useState<Deposit | null>(null);
  const [depositToDelete, setDepositToDelete] = useState<Deposit | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  
  const { deposits, clients, loading: dataLoading } = useData();
  const { toast } = useToast()

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

  const paginatedDeposits = useMemo(() => {
    const startIndex = (currentPage - 1) * DEPOSITS_PER_PAGE;
    const endIndex = startIndex + DEPOSITS_PER_PAGE;
    return deposits.slice(startIndex, endIndex);
  }, [deposits, currentPage]);
  
  const totalPages = Math.ceil(deposits.length / DEPOSITS_PER_PAGE);

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
  }

  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    if (!depositToEdit) return;
    try {
        const depositRef = doc(db, "deposits", depositToEdit.id);
        await updateDoc(depositRef, values);
        toast({ title: "Deposit Updated", description: "Deposit details have been updated." });
        setEditOpen(false);
    } catch(error: any) {
        toast({ title: "Error", description: error.message || "Failed to update deposit.", variant: "destructive" });
    }
  }

  const handleDeleteDeposit = async () => {
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
  }
  
  const openEditDialog = (deposit: Deposit) => {
    setDepositToEdit(deposit);
    editForm.reset({
        ...deposit,
        date: deposit.date
    });
    setEditOpen(true);
  }
  
  const openDeleteDialog = (deposit: Deposit) => {
    setDepositToDelete(deposit);
    setDeleteAlertOpen(true);
  }

  const clientFound = !!watchedShopId && clients.some(c => c.shopId === watchedShopId);
  const clientFoundEdit = !!watchedEditShopId && clients.some(c => c.shopId === watchedEditShopId);

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
          <h1 className="text-3xl font-bold text-foreground">Deposits</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client deposits.
          </p>
        </div>
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
      </div>
      {deposits.length > 0 ? (
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeposits.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell>{deposit.shopId}</TableCell>
                  <TableCell>{deposit.clientName}</TableCell>
                  <TableCell>{deposit.agent}</TableCell>
                  <TableCell>{format(deposit.date, "PPP")}</TableCell>
                  <TableCell>${deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>{deposit.paymentMode}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end mt-4">
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
              No Deposits Added
            </h2>
            <p className="text-muted-foreground mt-2">
              Add a new deposit to see the details here.
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
    </div>
  )
}

export default withAuth(DepositPage);

    