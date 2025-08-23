
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
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const clientSchema = z.object({
    shopId: z.string(),
    clientName: z.string(),
    agent: z.string(),
    kycCompletedDate: z.date(),
    status: z.string(),
    clientDetails: z.string(),
})

type Client = z.infer<typeof clientSchema>;

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

type Withdrawal = z.infer<typeof formSchema>

export default function WithdrawalPage() {
  const [open, setOpen] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const { toast } = useToast()

  const form = useForm<Withdrawal>({
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

  const watchedShopId = form.watch("shopId");

  useEffect(() => {
    const storedClients = localStorage.getItem("clients");
    if (storedClients) {
      const parsedClients = JSON.parse(storedClients).map((client: any) => ({
        ...client,
        kycCompletedDate: new Date(client.kycCompletedDate),
      }));
      setClients(parsedClients);
    }

    const storedWithdrawals = localStorage.getItem("withdrawals");
    if (storedWithdrawals) {
        const parsedWithdrawals = JSON.parse(storedWithdrawals).map((withdrawal: any) => ({
            ...withdrawal,
            date: new Date(withdrawal.date),
        }));
        setWithdrawals(parsedWithdrawals);
    }
  }, []);
  
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

  function onSubmit(values: Withdrawal) {
    const updatedWithdrawals = [...withdrawals, values]
    setWithdrawals(updatedWithdrawals)
    localStorage.setItem("withdrawals", JSON.stringify(updatedWithdrawals));
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
  }

  const clientFound = !!watchedShopId && clients.some(c => c.shopId === watchedShopId);

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Withdrawals</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client withdrawals.
          </p>
        </div>
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
      </div>
      {withdrawals.length > 0 ? (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal, index) => (
                <TableRow key={index}>
                  <TableCell>{withdrawal.shopId}</TableCell>
                  <TableCell>{withdrawal.clientName}</TableCell>
                  <TableCell>{withdrawal.agent}</TableCell>
                  <TableCell>{format(withdrawal.date, "PPP")}</TableCell>
                  <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                  <TableCell>{withdrawal.paymentMode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              No Withdrawals Added
            </h2>
            <p className="text-muted-foreground mt-2">
              Add a new withdrawal to see the details here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
