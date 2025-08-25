
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { z } from 'zod';
import { format, isToday, isThisMonth, getMonth, getYear, isValid, parseISO } from 'date-fns';
import { User, ClipboardList, Calendar, Briefcase, MapPin, UserPlus, TextSearch, TrendingUp, Users, UserCheck as UserCheckIcon, CalendarDays, BarChart, Loader2, MoreHorizontal, Edit, Trash2, Search, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import Papa from "papaparse";

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import withAuth from '@/components/with-auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { DailyAddedClient as Client, Agent } from '@/context/data-context';

type AgentStats = {
    [key: string]: {
        daily: number;
        monthly: number;
    }
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  age: z.coerce.number().min(18, "Client must be at least 18."),
  location: z.string().min(2, "Location is required."),
  work: z.string().min(2, "Work is required."),
  assignedAgent: z.string().optional(),
});

type PreviewRow = {
    data: any;
    status: 'Ready to Import' | 'Invalid Data';
    reason?: string;
}

function DailyAddedPage() {
  const { user, loading: authLoading } = useAuth();
  const { agents, dailyAddedClients, clients: allShops, loading: dataLoading } = useData();

  const [pastedDetails, setPastedDetails] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const { toast } = useToast();

  const [dailyCount, setDailyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [agentStats, setAgentStats] = useState<AgentStats>({});
  
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [bulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const userVisibleClients = useMemo(() => {
    if (!user || dataLoading) return [];
    if (user.role === 'Agent') {
      return dailyAddedClients.filter(c => c.assignedAgent === user.name);
    }
    return dailyAddedClients;
  }, [dailyAddedClients, user, dataLoading]);
  
  const filteredClients = useMemo(() => {
     return userVisibleClients.filter(client => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = searchTerm.trim() === '' ||
            client.name.toLowerCase().includes(lowercasedTerm) ||
            String(client.age).includes(lowercasedTerm) ||
            client.location.toLowerCase().includes(lowercasedTerm) ||
            client.work.toLowerCase().includes(lowercasedTerm) ||
            client.assignedAgent.toLowerCase().includes(lowercasedTerm);

        const matchesAgent = agentFilter === 'all' || client.assignedAgent === agentFilter;
        
        const clientDate = new Date(client.date);
        const matchesMonth = monthFilter === 'all' || getMonth(clientDate) === parseInt(monthFilter);
        const matchesYear = yearFilter === 'all' || getYear(clientDate) === parseInt(yearFilter);

        return matchesSearch && matchesAgent && matchesMonth && matchesYear;
    });
  }, [userVisibleClients, searchTerm, agentFilter, monthFilter, yearFilter]);


  const calculateStats = useCallback(() => {
    if (!dataLoading && user) {
        const statsSource = user.role === 'Agent' ? userVisibleClients : dailyAddedClients;
        
        const daily = statsSource.filter(c => isToday(new Date(c.date)));
        const monthly = statsSource.filter(c => isThisMonth(new Date(c.date)));

        setDailyCount(daily.length);
        setMonthlyCount(monthly.length);
        setTotalCount(statsSource.length);

        const stats: AgentStats = {};
        agents.forEach(agent => {
            stats[agent.name] = { daily: 0, monthly: 0 };
        });

        statsSource.forEach(client => {
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
    }
  }, [dataLoading, user, userVisibleClients, dailyAddedClients, agents]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const ageData = useMemo(() => {
    const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0, 'Unknown': 0 };
    filteredClients.forEach(client => {
        if (client.age >= 18 && client.age <= 25) ageGroups['18-25']++;
        else if (client.age >= 26 && client.age <= 35) ageGroups['26-35']++;
        else if (client.age >= 36 && client.age <= 45) ageGroups['36-45']++;
        else if (client.age >= 46 && client.age <= 55) ageGroups['46-55']++;
        else if (client.age >= 56) ageGroups['56+']++;
        else ageGroups['Unknown']++;
    });
    return Object.entries(ageGroups).map(([name, value]) => ({ name, count: value }));
  }, [filteredClients]);

  const handleAddClient = useCallback(async () => {
    if (isAddingClient || !user) {
        toast({ title: 'Error', description: 'You must be logged in to add a client.', variant: 'destructive'});
        return;
    }
    if (!pastedDetails) {
        toast({ title: 'No details provided', description: 'Please paste the client details.', variant: 'destructive'});
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
                name = lines[0]; age = parseInt(lines[1], 10) || 0; work = lines[2]; location = lines[3];
            } else { throw new Error("Could not parse details. Please ensure the pasted text is in a supported format."); }
        }
        
        if (!name || age < 18 || !location || !work) throw new Error("Invalid or incomplete details parsed.");

        // Check for duplicates in the main clients/shops collection
        const isDuplicate = allShops.some(shop => shop.clientName.toLowerCase() === name.toLowerCase());
        if (isDuplicate) {
            throw new Error(`Client "${name}" is already a registered shop and cannot be added again.`);
        }

        const newClientData = { name, age, location, work, assignedAgent: user.name, date: new Date() };
        await addDoc(collection(db, 'dailyAddedClients'), newClientData);
        toast({ title: 'Client Added', description: `${name} has been successfully added.`});
        setPastedDetails('');
    } catch (error: any) {
        toast({ title: 'Client Not Added', description: error.message, variant: 'destructive'});
    } finally {
        setIsAddingClient(false);
    }
  }, [isAddingClient, pastedDetails, user, toast, allShops]);

  const onEditSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    if (!clientToEdit) return;
    try {
      const clientRef = doc(db, "dailyAddedClients", clientToEdit.id);
      await updateDoc(clientRef, values);
      toast({ title: "Client Updated", description: "Client details have been updated." });
      setEditOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [clientToEdit, toast]);

  const handleDeleteClient = useCallback(async () => {
    if (!clientToDelete) return;
    try {
      await deleteDoc(doc(db, "dailyAddedClients", clientToDelete.id));
      toast({ title: "Client Deleted", description: `${clientToDelete.name} has been removed.`, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setDeleteAlertOpen(false); setClientToDelete(null);
  }, [clientToDelete, toast]);

  const handleBulkDelete = useCallback(async () => {
    const batch = writeBatch(db);
    selectedClients.forEach(id => batch.delete(doc(db, "dailyAddedClients", id)));
    try {
      await batch.commit();
      toast({ title: "Clients Deleted", description: `${selectedClients.length} clients have been deleted.` });
      setSelectedClients([]);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete selected clients.", variant: "destructive" });
    }
    setBulkDeleteAlertOpen(false);
  }, [selectedClients, toast]);

  const handleCsvUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const requiredHeaders = ["name", "age", "location", "work", "agent", "date"];
            if (!requiredHeaders.every(h => results.meta.fields?.map(f => f.toLowerCase()).includes(h))) {
                toast({
                    title: "Invalid CSV Format",
                    description: `CSV must contain headers: ${requiredHeaders.join(", ")}`,
                    variant: "destructive"
                });
                return;
            }

            const agentMap = new Map(agents.map(a => [a.name.toLowerCase(), a.name]));

            const validatedData = (results.data as any[]).map(row => {
                const agentNameLower = row.agent?.toLowerCase();
                const matchedAgentName = agentMap.get(agentNameLower);

                if (!matchedAgentName) {
                    return { data: row, status: 'Invalid Data' as const, reason: `Agent '${row.agent}' not found.` };
                }

                let clientDate = new Date(row.date);
                 if (!isValid(clientDate)) {
                    clientDate = parseISO(row.date);
                }

                if (!isValid(clientDate)) {
                    return { data: row, status: 'Invalid Data' as const, reason: 'Invalid date format.' };
                }

                const finalData = {
                    name: row.name,
                    age: parseInt(row.age, 10),
                    location: row.location,
                    work: row.work,
                    assignedAgent: matchedAgentName,
                    date: clientDate,
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

    if (csvInputRef.current) {
        csvInputRef.current.value = "";
    }
  }, [agents, toast]);

  const handleConfirmImport = useCallback(async () => {
    setIsImporting(true);
    const batch = writeBatch(db);
    let importedCount = 0;
    
    previewData.forEach(row => {
        if(row.status === 'Ready to Import') {
            const clientRef = doc(collection(db, "dailyAddedClients"));
            batch.set(clientRef, row.data);
            importedCount++;
        }
    });

    if (importedCount === 0) {
        toast({ title: "No Clients to Import", description: "There are no valid new clients to import.", variant: "destructive"});
        setIsImporting(false);
        setPreviewDialogOpen(false);
        return;
    }

    try {
        await batch.commit();
        toast({
            title: "Import Complete",
            description: `${importedCount} clients imported successfully.`,
        });
    } catch (error) {
        toast({ title: "Import Error", description: "An error occurred during the batch import.", variant: "destructive" });
    } finally {
        setIsImporting(false);
        setPreviewDialogOpen(false);
        setPreviewData([]);
    }
  }, [previewData, toast]);

  const openEditDialog = useCallback((client: Client) => {
    setClientToEdit(client);
    editForm.reset(client);
    setEditOpen(true);
  }, [editForm]);

  const openDeleteDialog = useCallback((client: Client) => {
    setClientToDelete(client);
    setDeleteAlertOpen(true);
  }, []);
  
  const displayAgents = useMemo(() => agents.filter(agent => agent.role !== 'Superadmin'), [agents]);

  const availableYears = useMemo(() => {
    const years = new Set(userVisibleClients.map(c => getYear(new Date(c.date))));
    return Array.from(years).sort((a,b) => b - a);
  }, [userVisibleClients]);
  
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  })), []);


  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedClients(checked ? filteredClients.map(c => c.id) : []);
  }, [filteredClients]);

  const handleSelectClient = useCallback((clientId: string, checked: boolean) => {
    setSelectedClients(prev => checked ? [...prev, clientId] : prev.filter(id => id !== clientId));
  }, []);

  const canManage = user?.role === 'Admin' || user?.role === 'Superadmin';
  const readyToImportCount = useMemo(() => previewData.filter(row => row.status === 'Ready to Import').length, [previewData]);


  if (authLoading || dataLoading) {
    return (<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>);
  }

  return (
    <div className="w-full h-full">
        <div className="flex justify-between items-center mb-6">
            <div><h1 className="text-3xl font-bold text-foreground">Daily Added Clients</h1><p className="text-muted-foreground mt-1">Track and manage daily client entries and statistics.</p></div>
            {canManage && (
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Import CSV
                    </Button>
                    <input type="file" ref={csvInputRef} accept=".csv" onChange={handleCsvUpload} className="hidden" />
                </div>
            )}
        </div>
      
        <Tabs defaultValue="dashboard">
            <TabsList className="mb-4"><TabsTrigger value="dashboard">Dashboard</TabsTrigger><TabsTrigger value="statistics">Statistics</TabsTrigger></TabsList>
            <TabsContent value="dashboard">
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Overall Performance</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Daily Clients</CardTitle>
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">{dailyCount}</div>
                                    <p className="text-xs text-muted-foreground">Clients added today</p>
                                </CardContent>
                            </Card>
                            <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Clients</CardTitle>
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">{monthlyCount}</div>
                                    <p className="text-xs text-muted-foreground">Clients added this month</p>
                                </CardContent>
                            </Card>
                             <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold text-primary">{totalCount}</div>
                                    <p className="text-xs text-muted-foreground">All-time client count</p>
                                </CardContent>
                            </Card>
                        </div>
                        {user?.role !== 'Agent' && (<>
                            <h2 className="text-xl font-semibold my-6 flex items-center"><UserCheckIcon className="mr-2 h-5 w-5" /> Agent Performance</h2>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                {Object.keys(agentStats).length > 0 ? Object.entries(agentStats).map(([agent, stats]) => (
                                    <Card key={agent} className="hover:border-primary/50 hover:shadow-md transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base font-medium flex items-center justify-between">
                                                {agent}
                                                <UserCheckIcon className="h-4 w-4 text-muted-foreground" />
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-2">
                                            <div>
                                                <div className="text-2xl font-bold">{stats.daily}</div>
                                                <p className="text-xs text-muted-foreground">Daily Clients</p>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">{stats.monthly}</div>
                                                <p className="text-xs text-muted-foreground">Monthly Clients</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )) : <p className="text-muted-foreground text-sm col-span-full">No agent activity yet.</p>}
                            </div>
                        </>)}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><TextSearch className="mr-2 h-5 w-5" /> Parsing Area</h2>
                        <div className='space-y-4'>
                            <div className="space-y-2"><Label htmlFor="pasted-details">1. Paste Client Details Here</Label><Textarea id="pasted-details" placeholder="e.g.
Client Name: Jason
Age: 40
Work: Captain in a cruise ship
Location: UAE" className='min-h-[150px] mt-2' value={pastedDetails} onChange={(e) => setPastedDetails(e.target.value)} /></div>
                            <Button onClick={handleAddClient} disabled={isAddingClient} className='w-full'>{isAddingClient ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding Client...</>) : (<><UserPlus className="mr-2 h-4 w-4" /> 2. Parse and Add Client</>)}</Button>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-semibold">All Added Clients</h2>
                          {canManage && selectedClients.length > 0 && (<Button size="sm" variant="destructive" onClick={() => setBulkDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete Selected ({selectedClients.length})</Button>)}
                        </div>
                        
                         <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search clients..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        
                        {filteredClients.length > 0 ? (<div className="rounded-lg border bg-card">
                            <Table><TableHeader><TableRow>
                                {canManage && <TableHead><Checkbox onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={selectedClients.length === filteredClients.length && filteredClients.length > 0} /></TableHead>}
                                <TableHead><User className="inline-block mr-2 h-4 w-4" />Name</TableHead><TableHead><ClipboardList className="inline-block mr-2 h-4 w-4" />Age</TableHead><TableHead><MapPin className="inline-block mr-2 h-4 w-4" />Location</TableHead><TableHead><Briefcase className="inline-block mr-2 h-4 w-4" />Work</TableHead><TableHead><UserPlus className="inline-block mr-2 h-4 w-4" />Assigned Agent</TableHead><TableHead><Calendar className="inline-block mr-2 h-4 w-4" />Date</TableHead>
                                {canManage && <TableHead>Actions</TableHead>}
                            </TableRow></TableHeader><TableBody>
                                {filteredClients.map((client) => (<TableRow key={client.id} data-state={selectedClients.includes(client.id) && "selected"}>
                                    {canManage && <TableCell><Checkbox onCheckedChange={(checked) => handleSelectClient(client.id, Boolean(checked))} checked={selectedClients.includes(client.id)} /></TableCell>}
                                    <TableCell>{client.name}</TableCell><TableCell>{client.age}</TableCell><TableCell>{client.location}</TableCell><TableCell>{client.work}</TableCell><TableCell>{client.assignedAgent}</TableCell><TableCell>{format(new Date(client.date), 'PPP')}</TableCell>
                                    {canManage && <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => openEditDialog(client)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuItem onClick={() => openDeleteDialog(client)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>}
                                </TableRow>))}
                            </TableBody></Table></div>
                        ) : (<div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[30vh]"><div className="text-center"><h2 className="text-2xl font-bold tracking-tight text-foreground">No Clients Found</h2><p className="text-muted-foreground mt-2">{user?.role === 'Agent' ? 'Clients you add will appear here.' : 'Try adjusting your filters.'}</p></div></div>)}
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="statistics"><Card><CardHeader><CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5" /> Client Age Distribution</CardTitle></CardHeader><CardContent className="h-[400px]"><ResponsiveContainer width="100%" height="100%"><RechartsBarChart data={ageData}><XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Number of Clients', angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fontSize: '14px', fill: '#888' } }} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} /><Legend /><Bar dataKey="count" fill="hsl(var(--primary))" name="Clients" radius={[4, 4, 0, 0]} /></RechartsBarChart></ResponsiveContainer></CardContent></Card></TabsContent>
        </Tabs>
        <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit Client</DialogTitle><DialogDescription>Update the details for {clientToEdit?.name}.</DialogDescription></DialogHeader><Form {...editForm}><form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={editForm.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={editForm.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={editForm.control} name="work" render={({ field }) => (<FormItem><FormLabel>Work</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            {canManage && (
              <FormField
                control={editForm.control}
                name="assignedAgent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Agent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {displayAgents.map(agent => (
                          <SelectItem key={agent.id} value={agent.name}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit">Save Changes</Button></DialogFooter></form></Form></DialogContent></Dialog>
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the client record for {clientToDelete?.name}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteClient}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <AlertDialog open={bulkDeleteAlertOpen} onOpenChange={setBulkDeleteAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the selected {selectedClients.length} client records.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
                                <TableHead>Name</TableHead>
                                <TableHead>Age</TableHead>
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
                                    <TableCell>{row.data.name}</TableCell>
                                    <TableCell>{row.data.age}</TableCell>
                                    <TableCell>{row.data.assignedAgent || row.data.agent}</TableCell>
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
  );
}

export default withAuth(DailyAddedPage, ['Agent', 'Admin', 'Superadmin']);

    