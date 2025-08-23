
"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { isToday, isThisMonth } from "date-fns"
import { User, Calendar, BarChart, Banknote, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

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

// --- Client Information Form ---
type ClientInformation = {
    id: number;
    shopId: string;
    assets: string;
    clientDetails: string;
    conversationSummary: string;
    planForTomorrow: string;
    isCollapsed: boolean;
};


export default function ReportingPage() {
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const [dailyAddedClients, setDailyAddedClients] = useState<DailyAddedClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  
  const [clientInfoList, setClientInfoList] = useState<ClientInformation[]>([
    { id: 1, shopId: '', assets: '', clientDetails: '', conversationSummary: '', planForTomorrow: '', isCollapsed: false },
  ]);
  
  const { toast } = useToast();

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
  
  const addClient = () => {
    const newClient: ClientInformation = {
      id: clientInfoList.length ? Math.max(...clientInfoList.map(c => c.id)) + 1 : 1,
      shopId: '',
      assets: '',
      clientDetails: '',
      conversationSummary: '',
      planForTomorrow: '',
      isCollapsed: false,
    };
    setClientInfoList([...clientInfoList, newClient]);
  };
  
  const removeClient = (id: number) => {
    setClientInfoList(clientInfoList.filter(client => client.id !== id));
  };
  
  const handleClientInfoChange = (id: number, field: keyof Omit<ClientInformation, 'id' | 'isCollapsed'>, value: string) => {
    setClientInfoList(clientInfoList.map(client =>
      client.id === id ? { ...client, [field]: value } : client
    ));
  };

  const toggleClientCollapse = (id: number) => {
    setClientInfoList(clientInfoList.map(client =>
      client.id === id ? { ...client, isCollapsed: !client.isCollapsed } : client
    ));
  }

  const getProgress = (client: ClientInformation) => {
    const requiredFields: (keyof Omit<ClientInformation, 'id'| 'isCollapsed' | 'shopId' | 'assets' | 'clientDetails'>)[] = ['conversationSummary', 'planForTomorrow'];
    const filledCount = requiredFields.filter(field => client[field].trim() !== '').length;
    return (filledCount / requiredFields.length) * 100;
  }
  
  return (
    <div className="w-full h-full space-y-6">
      <div className="flex justify-between items-center">
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

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Enter details for each client</CardDescription>
          </div>
          <Button variant="outline" onClick={addClient}>
            <Plus className="mr-2 h-4 w-4"/> Add Client
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
            {clientInfoList.map((client, index) => (
                <Card key={client.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 p-4 flex flex-row justify-between items-center cursor-pointer" onClick={() => toggleClientCollapse(client.id)}>
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-lg">Client {index + 1}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Progress value={getProgress(client)} className="w-24 h-2"/>
                                <span className="text-xs text-muted-foreground">{getProgress(client) === 100 ? '2/2 completed' : `${Math.round(getProgress(client)/100 * 2)}/2 completed`}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeClient(client.id); }} className="h-8 w-8">
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                {client.isCollapsed ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </CardHeader>
                    {!client.isCollapsed && (
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`shopId-${client.id}`}>Shop ID</Label>
                                    <Input id={`shopId-${client.id}`} value={client.shopId} onChange={(e) => handleClientInfoChange(client.id, 'shopId', e.target.value)} placeholder="Enter shop ID"/>
                                </div>
                                <div>
                                    <Label htmlFor={`assets-${client.id}`}>Assets</Label>
                                    <Input id={`assets-${client.id}`} value={client.assets} onChange={(e) => handleClientInfoChange(client.id, 'assets', e.target.value)} placeholder="Enter client assets"/>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor={`clientDetails-${client.id}`}>Client Details</Label>
                                <Textarea id={`clientDetails-${client.id}`} value={client.clientDetails} onChange={(e) => handleClientInfoChange(client.id, 'clientDetails', e.target.value)} placeholder="Client Name/ Age/ Job/Location"/>
                            </div>
                            <div>
                                <Label htmlFor={`conversationSummary-${client.id}`}>Conversation Summary *</Label>
                                <Textarea id={`conversationSummary-${client.id}`} value={client.conversationSummary} onChange={(e) => handleClientInfoChange(client.id, 'conversationSummary', e.target.value)} placeholder="Summarize your conversation"/>
                            </div>
                            <div>
                                <Label htmlFor={`planForTomorrow-${client.id}`}>Plan for Tomorrow *</Label>
                                <Textarea id={`planForTomorrow-${client.id}`} value={client.planForTomorrow} onChange={(e) => handleClientInfoChange(client.id, 'planForTomorrow', e.target.value)} placeholder="What's the plan for tomorrow?"/>
                            </div>
                        </CardContent>
                    )}
                </Card>
            ))}
            <Button variant="outline" onClick={addClient} className="w-full">
                <Plus className="mr-2 h-4 w-4"/> Add Another Client
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}
