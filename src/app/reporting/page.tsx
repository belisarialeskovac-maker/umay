
"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { isToday, isThisMonth, startOfMonth, endOfMonth } from "date-fns"
import { User, Calendar, BarChart, Banknote } from "lucide-react"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// --- Data Schemas ---

const agentSchema = z.object({
  name: z.string(),
  email: z.string(),
  dateHired: z.date(),
  agentType: z.string(),
});
type Agent = z.infer<typeof agentSchema>;

const dailyAddedClientSchema = z.object({
  assignedAgent: z.string(),
  date: z.date(),
});
type DailyAddedClient = z.infer<typeof dailyAddedClientSchema>;

const clientSchema = z.object({
  agent: z.string(),
  kycCompletedDate: z.date(),
});
type Client = z.infer<typeof clientSchema>;

const depositSchema = z.object({
  agent: z.string(),
  date: z.date(),
  amount: z.number(),
});
type Deposit = z.infer<typeof depositSchema>;

// --- Form Schema ---

const reportingFormSchema = z.object({
  agent: z.string().min(1, "Please select an agent."),
});
type ReportingForm = z.infer<typeof reportingFormSchema>;


export default function ReportingPage() {
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const [dailyAddedClients, setDailyAddedClients] = useState<DailyAddedClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const form = useForm<ReportingForm>({
    resolver: zodResolver(reportingFormSchema),
  });

  // --- Data Loading Effect ---
  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      setRegisteredAgents(JSON.parse(storedAgents).map((a: any) => ({ ...a, dateHired: new Date(a.dateHired) })));
    }
    
    const storedDailyAdded = localStorage.getItem("dailyAddedClients");
    if (storedDailyAdded) {
        setDailyAddedClients(JSON.parse(storedDailyAdded).map((c: any) => ({ ...c, date: new Date(c.date) })));
    }

    const storedClients = localStorage.getItem("clients");
    if (storedClients) {
        setClients(JSON.parse(storedClients).map((c: any) => ({ ...c, kycCompletedDate: new Date(c.kycCompletedDate) })));
    }

    const storedDeposits = localStorage.getItem("deposits");
    if (storedDeposits) {
        setDeposits(JSON.parse(storedDeposits).map((d: any) => ({ ...d, date: new Date(d.date) })));
    }
  }, []);

  const agentStats = useMemo(() => {
    if (!selectedAgent) return {
      addedToday: 0,
      monthlyAdded: 0,
      openShops: 0,
      monthlyDeposits: 0,
    };

    const addedToday = dailyAddedClients.filter(c => c.assignedAgent === selectedAgent && isToday(c.date)).length;
    const monthlyAdded = dailyAddedClients.filter(c => c.assignedAgent === selectedAgent && isThisMonth(c.date)).length;
    const openShops = clients.filter(c => c.agent === selectedAgent && isThisMonth(c.kycCompletedDate)).length;
    const monthlyDeposits = deposits
      .filter(d => d.agent === selectedAgent && isThisMonth(d.date))
      .reduce((sum, d) => sum + d.amount, 0);

    return { addedToday, monthlyAdded, openShops, monthlyDeposits };
  }, [selectedAgent, dailyAddedClients, clients, deposits]);

  const handleAgentChange = (agentName: string) => {
    setSelectedAgent(agentName);
    form.setValue("agent", agentName);
  };
  
  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Generate reports for individual agent performance.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Report</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="max-w-md space-y-6">
                <Form {...form}>
                    <form>
                        <FormField
                            control={form.control}
                            name="agent"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Agent Name *</FormLabel>
                                <Select onValueChange={handleAgentChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an agent to generate a report" />
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
                    </form>
                </Form>

                {selectedAgent && (
                    <div className="space-y-4 pt-4 border-t mt-6">
                        <h3 className="text-lg font-medium text-foreground">
                            Report for {selectedAgent}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/>Added Client Today *</Label>
                                <Input value={agentStats.addedToday} readOnly disabled />
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/>Monthly Client Added *</Label>
                                <Input value={agentStats.monthlyAdded} readOnly disabled/>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-muted-foreground"><BarChart className="h-4 w-4"/>Open Shops *</Label>
                                <Input value={agentStats.openShops} readOnly disabled/>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-muted-foreground"><Banknote className="h-4 w-4"/>Deposits *</Label>
                                <Input value={`$${agentStats.monthlyDeposits.toFixed(2)}`} readOnly disabled/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
