
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

const agentSchema = z.object({
    name: z.string(),
    email: z.string(),
    dateHired: z.date(),
    agentType: z.string(),
})

type Agent = z.infer<typeof agentSchema>;

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

type Deposit = z.infer<typeof formSchema>

export default function DepositPage() {
  const [open, setOpen] = useState(false)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const { toast } = useToast()

  const form = useForm<Deposit>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopId: "",
      clientName: "",
      agent: "",
      paymentMode: "Ewallet/Online Banking"
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

    const storedDeposits = localStorage.getItem("deposits");
    if (storedDeposits) {
        const parsedDeposits = JSON.parse(storedDeposits).map((deposit: any) => ({
            ...deposit,
            date: new Date(deposit.date),
        }));
        setDeposits(parsedDeposits);
    }
  }, []);

  function onSubmit(values: Deposit) {
    const updatedDeposits = [...deposits, values]
    setDeposits(updatedDeposits)
    localStorage.setItem("deposits", JSON.stringify(updatedDeposits));
    toast({
      title: "Deposit Added",
      description: `Successfully added deposit for ${values.clientName}.`,
    })
    setOpen(false)
    form.reset()
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
              {deposits.map((deposit, index) => (
                <TableRow key={index}>
                  <TableCell>{deposit.shopId}</TableCell>
                  <TableCell>{deposit.clientName}</TableCell>
                  <TableCell>{deposit.agent}</TableCell>
                  <TableCell>{format(deposit.date, "PPP")}</TableCell>
                  <TableCell>${deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>{deposit.paymentMode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
    </div>
  )
}

    