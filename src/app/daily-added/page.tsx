
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { format, isToday, isThisMonth } from 'date-fns';
import { User, ClipboardList, Calendar, Briefcase, MapPin, UserPlus, TextSearch, TrendingUp, Users, UserCheck as UserCheckIcon, CalendarDays, BarChart, Loader2 } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import withAuth from '@/components/with-auth';
import { Label } from '@/components/ui/label';
import type { DailyAddedClient as Client, Agent } from '@/context/data-context';

type AgentStats = {
    [key: string]: {
        daily: number;
        monthly: number;
    }
}

function DailyAddedPage() {
  const { user, loading: authLoading } = useAuth();
  const { agents, dailyAddedClients, loading: dataLoading } = useData();

  const [pastedDetails, setPastedDetails] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const { toast } = useToast();

  const [visibleClients, setVisibleClients] = useState<Client[]>([]);
  const [dailyCount, setDailyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [agentStats, setAgentStats] = useState<AgentStats>({});

  useEffect(() => {
    if (user && !dataLoading) {
      if (user.role === 'Agent') {
        setVisibleClients(dailyAddedClients.filter(c => c.assignedAgent === user.name));
      } else {
        setVisibleClients(dailyAddedClients);
      }
    }
  }, [user, dailyAddedClients, dataLoading]);

  const calculateStats = useCallback((clientsToProcess: Client[], currentAgents: Agent[]) => {
    const daily = clientsToProcess.filter(c => isToday(new Date(c.date)));
    const monthly = clientsToProcess.filter(c => isThisMonth(new Date(c.date)));

    setDailyCount(daily.length);
    setMonthlyCount(monthly.length);
    setTotalCount(clientsToProcess.length);

    const stats: AgentStats = {};

    currentAgents.forEach(agent => {
        stats[agent.name] = { daily: 0, monthly: 0 };
    });

    clientsToProcess.forEach(client => {
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
    if (!dataLoading && user) {
        // For admins, calculate stats on all clients, for agents, on their own.
        const statsSource = user.role === 'Agent' ? visibleClients : dailyAddedClients;
        calculateStats(statsSource, agents);
    }
  }, [dailyAddedClients, agents, dataLoading, calculateStats, user, visibleClients]);

  const ageData = useMemo(() => {
    const ageGroups = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-55': 0,
        '56+': 0,
        'Unknown': 0,
    };

    visibleClients.forEach(client => {
        if (client.age >= 18 && client.age <= 25) ageGroups['18-25']++;
        else if (client.age >= 26 && client.age <= 35) ageGroups['26-35']++;
        else if (client.age >= 36 && client.age <= 45) ageGroups['36-45']++;
        else if (client.age >= 46 && client.age <= 55) ageGroups['46-55']++;
        else if (client.age >= 56) ageGroups['56+']++;
        else ageGroups['Unknown']++;
    });

    return Object.entries(ageGroups).map(([name, value]) => ({ name, count: value }));
  }, [visibleClients]);


  const handleAddClient = async () => {
    if (isAddingClient) return;

    if (!user) {
        toast({
            title: 'Not Logged In',
            description: 'You must be logged in to add a client.',
            variant: 'destructive',
        });
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
    
    setIsAddingClient(true);
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
            name = nameMatch ? nameMatch[1].trim() : 'N/A';
            age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
            location = locMatch ? locMatch[1].trim() : 'N/A';
            work = workMatch ? workMatch[1].trim() : 'N/A';
        } else {
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

        const newClientData = {
          name,
          age,
          location,
          work,
          assignedAgent: user.name, // Automatically assign the logged-in agent
          date: new Date(),
        };

        await addDoc(collection(db, 'dailyAddedClients'), newClientData);
        
        toast({
          title: 'Client Added',
          description: `${name} has been successfully added to your list. The table will update shortly.`,
        });

        setPastedDetails('');

    } catch (error: any) {
        toast({
            title: 'Parsing Failed',
            description: error.message || 'Please ensure the pasted text is in a supported format.',
            variant: 'destructive',
        });
    } finally {
        setIsAddingClient(false);
    }
  }

  if (authLoading || dataLoading) {
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
            <h1 className="text-3xl font-bold text-foreground">Daily Added Clients</h1>
            <p className="text-muted-foreground mt-1">
                Track and manage daily client entries and statistics.
            </p>
            </div>
        </div>
      
        <Tabs defaultValue="dashboard">
            <TabsList className="mb-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Overall Performance</h2>
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
                        {user?.role !== 'Agent' && (
                            <>
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
                            </>
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><TextSearch className="mr-2 h-5 w-5" /> Parsing Area</h2>
                        <div className='space-y-4'>
                            <div className="space-y-2">
                                <Label htmlFor="pasted-details">1. Paste Client Details Here</Label>
                                <Textarea 
                                    id="pasted-details"
                                    placeholder="e.g.&#10;Client Name: Jason&#10;Age: 40&#10;Work: Captain in a cruise ship&#10;Location: UAE&#10;&#10;Or:&#10;Camible&#10;47&#10;LTO Public Servant&#10;Benguet"
                                    className='min-h-[150px] mt-2'
                                    value={pastedDetails}
                                    onChange={(e) => setPastedDetails(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddClient} disabled={isAddingClient} className='w-full'>
                                {isAddingClient ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding Client...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" /> 2. Parse and Add Client
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-xl font-semibold mb-4">All Added Clients</h2>
                        {visibleClients.length > 0 ? (
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
                                {visibleClients.map((client) => (
                                    <TableRow key={client.id}>
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
                                No Clients Added Yet
                                </h2>
                                <p className="text-muted-foreground mt-2">
                                {user?.role === 'Agent' ? 'Clients you add will appear here.' : 'Clients added from the parsing area will appear here.'}
                                </p>
                            </div>
                            </div>
                        )}
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="statistics">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5" /> Client Age Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={ageData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Number of Clients', angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fontSize: '14px', fill: '#888' } }}/>
                                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}} />
                                <Legend />
                                <Bar dataKey="count" fill="hsl(var(--primary))" name="Clients" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

export default withAuth(DailyAddedPage, ['Agent', 'Admin', 'Superadmin']);
