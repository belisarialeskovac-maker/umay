
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isToday, isThisMonth } from 'date-fns';
import { User, ClipboardList, Calendar, Briefcase, MapPin, UserPlus, TextSearch, TrendingUp, Users, UserCheck as UserCheckIcon, CalendarDays, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const agentSchema = z.object({
  name: z.string(),
  email: z.string(),
  dateHired: z.date(),
  agentType: z.string(),
});

type Agent = z.infer<typeof agentSchema>;

const clientFormSchema = z.object({
    assignedAgent: z.string().min(1, "An agent must be selected."),
});

type ClientForm = z.infer<typeof clientFormSchema>;

type Client = {
    name: string;
    age: number;
    location: string;
    work: string;
    assignedAgent: string;
    date: Date;
};

type AgentStats = {
    [key: string]: {
        daily: number;
        monthly: number;
    }
}

export default function DailyAddedPage() {
  const [sessionClients, setSessionClients] = useState<Client[]>([]);
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([]);
  const [pastedDetails, setPastedDetails] = useState('');
  const { toast } = useToast();

  const [dailyCount, setDailyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [agentStats, setAgentStats] = useState<AgentStats>({});

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
        assignedAgent: "",
    },
  });

  const calculateStats = useCallback(() => {
    const allDailyClients: Client[] = JSON.parse(localStorage.getItem('dailyAddedClients') || '[]').map((c: any) => ({...c, date: new Date(c.date)}));
    const currentAgents: Agent[] = JSON.parse(localStorage.getItem('agents') || '[]').map((a: any) => ({...a, dateHired: new Date(a.dateHired)}));

    const daily = allDailyClients.filter(c => isToday(new Date(c.date)));
    const monthly = allDailyClients.filter(c => isThisMonth(new Date(c.date)));

    setDailyCount(daily.length);
    setMonthlyCount(monthly.length);
    setTotalCount(allDailyClients.length);

    const stats: AgentStats = {};

    currentAgents.forEach(agent => {
        stats[agent.name] = { daily: 0, monthly: 0 };
    });

    allDailyClients.forEach(client => {
        if(stats[client.assignedAgent]) {
            if (isToday(new Date(client.date))) {
                stats[client.assignedAgent].daily++;
            }
            if (isThisMonth(new Date(client.date))) {
                stats[client.assignedAgent].monthly++;
            }
        }
    });

    setAgentStats(stats);
  }, []);

  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      const parsedAgents = JSON.parse(storedAgents).map((agent: any) => ({
        ...agent,
        dateHired: new Date(agent.dateHired),
      }));
      setRegisteredAgents(parsedAgents);
    }
    
    calculateStats();
  }, [calculateStats]);


  const handleAddClient = () => {
    const agentValue = form.getValues('assignedAgent');
    if (!agentValue) {
        form.setError("assignedAgent", { type: "manual", message: "Please select an agent."});
        return;
    }

    if (!pastedDetails) {
        toast({
            title: 'No details provided',
            description: 'Please paste the client details into the text area.',
            variant: 'destructive',
        });
        return;
    }
    
    try {
        const nameRegex = /(?:client name|name):\s*(.*)/i;
        const ageRegex = /age:\s*(\d+)/i;
        const locRegex = /(?:loc|location):\s*(.*)/i;
        const workRegex = /(?:work|occupation):\s*(.*)/i;

        const nameMatch = pastedDetails.match(nameRegex);
        const ageMatch = pastedDetails.match(ageRegex);
        const locMatch = pastedDetails.match(locRegex);
        const workMatch = pastedDetails.match(workRegex);

        let name: string, age: number, location: string, work: string;

        if (nameMatch || ageMatch || locMatch || workMatch) {
            // Labeled format parsing
            name = nameMatch ? nameMatch[1].trim() : 'N/A';
            age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
            location = locMatch ? locMatch[1].trim() : 'N/A';
            work = workMatch ? workMatch[1].trim() : 'N/A';
        } else {
            // Label-less format parsing
            const lines = pastedDetails.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length >= 4) {
                name = lines[0];
                age = parseInt(lines[1], 10) || 0;
                work = lines[2];
                location = lines[3];
            } else {
                 throw new Error("Could not parse details. Please ensure the pasted text is in a supported format.");
            }
        }
        
        if (!name || age === 0 || !location || !work) {
            throw new Error("Could not parse all details. Please check the format.");
        }

        const newClient: Client = {
          name,
          age,
          location,
          work,
          assignedAgent: agentValue,
          date: new Date(),
        };

        setSessionClients((prevClients) => [...prevClients, newClient]);
        
        const allDailyClients = JSON.parse(localStorage.getItem('dailyAddedClients') || '[]');
        allDailyClients.push(newClient);
        localStorage.setItem('dailyAddedClients', JSON.stringify(allDailyClients));

        toast({
          title: 'Client Added',
          description: `${name} has been successfully added.`,
        });

        form.reset({ assignedAgent: "" });
        setPastedDetails('');
        
        calculateStats();

    } catch (error: any) {
        toast({
            title: 'Parsing Failed',
            description: error.message || 'Please ensure the pasted text is in a supported format.',
            variant: 'destructive',
        });
    }
  }

  const handleClearData = () => {
    localStorage.removeItem('dailyAddedClients');
    setSessionClients([]);
    calculateStats();
    toast({
        title: "Data Cleared",
        description: "All daily added client data has been cleared."
    })
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Added Clients</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage daily client entries and statistics.
          </p>
        </div>
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all daily added client data from your browser's storage.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <div className="space-y-8">

        {/* Dashboard Section */}
        <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Dashboard</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Clients</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyCount}</div>
                        <p className="text-xs text-muted-foreground">Clients added today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Clients</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyCount}</div>
                        <p className="text-xs text-muted-foreground">Clients added this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCount}</div>
                        <p className="text-xs text-muted-foreground">All-time client count</p>
                    </CardContent>
                </Card>
            </div>
             <h2 className="text-xl font-semibold my-4 flex items-center"><UserCheckIcon className="mr-2 h-5 w-5" /> Agent Performance</h2>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.keys(agentStats).length > 0 ? Object.entries(agentStats).map(([agent, stats]) => (
                    <Card key={agent}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{agent}</CardTitle>
                            <UserCheckIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.daily}</div>
                            <p className="text-xs text-muted-foreground">Daily Clients</p>
                             <div className="text-2xl font-bold mt-2">{stats.monthly}</div>
                            <p className="text-xs text-muted-foreground">Monthly Clients</p>
                        </CardContent>
                    </Card>
                )) : <p className="text-muted-foreground text-sm col-span-full">No agent activity yet. Register agents and add clients to see performance.</p>}
            </div>
        </div>

        {/* Parsing Area */}
        <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center"><TextSearch className="mr-2 h-5 w-5" /> Parsing Area</h2>
            <div className='space-y-4'>
                <Form {...form}>
                    <form className="space-y-4">
                        <div>
                            <FormLabel htmlFor="pasted-details">1. Paste Client Details Here</FormLabel>
                            <Textarea 
                                id="pasted-details"
                                placeholder="e.g.&#10;Client Name: Jason&#10;Age: 40&#10;Work: Captain in a cruise ship&#10;Location: UAE&#10;&#10;Or:&#10;Camible&#10;47&#10;LTO Public Servant&#10;Benguet"
                                className='min-h-[150px] mt-2'
                                value={pastedDetails}
                                onChange={(e) => setPastedDetails(e.target.value)}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="assignedAgent"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>2. Select Assigned Agent</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an agent" />
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
                 <Button onClick={handleAddClient} className='w-full'>
                    <UserPlus className="mr-2 h-4 w-4" /> 3. Parse and Add Client
                </Button>
            </div>
        </div>
        
        {/* Table Area */}
        <div>
            <h2 className="text-xl font-semibold mb-4">Added This Session</h2>
            {sessionClients.length > 0 ? (
                <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead><User className="inline-block mr-2 h-4 w-4" />Name</TableHead>
                        <TableHead><ClipboardList className="inline-block mr-2 h-4 w-4" />Age</TableHead>
                        <TableHead><MapPin className="inline-block mr-2 h-4 w-4" />Location</TableHead>
                        <TableHead><Briefcase className="inline-block mr-2 h-4 w-4" />Work</TableHead>
                        <TableHead><UserPlus className="inline-block mr-2 h-4 w-4" />Assigned Agent</TableHead>
                        <TableHead><Calendar className="inline-block mr-2 h-4 w-4" />Date</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {sessionClients.map((client, index) => (
                        <TableRow key={index}>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>{client.age}</TableCell>
                        <TableCell>{client.location}</TableCell>
                        <TableCell>{client.work}</TableCell>
                        <TableCell>{client.assignedAgent}</TableCell>
                        <TableCell>{format(client.date, 'PPP')}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[30vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    No Clients Added This Session
                    </h2>
                    <p className="text-muted-foreground mt-2">
                    Clients added in this session will appear here.
                    </p>
                </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
