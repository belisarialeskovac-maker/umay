
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { format, isToday, isThisMonth, startOfToday } from "date-fns"
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, FileText, RefreshCw, Languages, Copy, Download, Upload, Calendar, BarChart, Banknote } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, onSnapshot, Timestamp } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useData } from "@/context/data-context"
import withAuth from "@/components/with-auth"
import type { Client } from "@/context/data-context"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"


type ClientInformation = {
    id: string; // Use string for firestore doc id consistency
    shopId: string;
    assets: string;
    clientDetails: string;
    conversationSummary: string;
    planForTomorrow: string;
    isCollapsed: boolean;
};

function ReportingPage() {
  const { user, loading: authLoading } = useAuth();
  const { 
    clients, 
    deposits, 
    dailyAddedClients,
    loading: dataLoading 
  } = useData();
  
  const [clientInfoList, setClientInfoList] = useState<ClientInformation[]>([]);
  const [generatedReport, setGeneratedReport] = useState("");
  const [isReportCardCollapsed, setReportCardCollapsed] = useState(true);
  const { toast } = useToast();
  const [isReportDataLoading, setIsReportDataLoading] = useState(true);

  const getReportDocRef = useCallback(() => {
    if (!user) return null;
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    return doc(db, 'dailyReports', `${user.uid}_${todayStr}`);
  }, [user]);

  const agentClients = useMemo(() => {
    if (!user || !clients) return [];
    return clients.filter(item => item.agent === user.name);
  }, [user, clients]);


  useEffect(() => {
    if (!user || !getReportDocRef()) {
        setIsReportDataLoading(false);
        return;
    };
    
    const docRef = getReportDocRef();
    if (!docRef) return;
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setClientInfoList(data.clients || []);
        } else {
            // No report for today, start with a default one
             setClientInfoList([{ id: new Date().getTime().toString(), shopId: '', assets: '', clientDetails: '', conversationSummary: '', planForTomorrow: '', isCollapsed: false }]);
        }
        setIsReportDataLoading(false);
    }, (error) => {
        console.error("Error fetching daily report:", error);
        toast({title: "Error", description: "Could not load today's report.", variant: "destructive"});
        setIsReportDataLoading(false);
    });

    return () => unsubscribe();
  }, [user, getReportDocRef, toast]);


  const agentStats = useMemo(() => {
    if (!user) return {
      addedToday: 0,
      monthlyAdded: 0,
      openShops: 0,
      monthlyDeposits: 0,
    };

    const addedToday = dailyAddedClients.filter(c => c.assignedAgent === user.name && isToday(c.date)).length;
    const monthlyAdded = dailyAddedClients.filter(c => c.assignedAgent === user.name && isThisMonth(c.date)).length;
    const openShops = clients.filter(c => c.agent === user.name && isThisMonth(c.kycCompletedDate)).length;
    const monthlyDeposits = deposits
      .filter(d => d.agent === user.name && isThisMonth(d.date))
      .reduce((sum, d) => sum + d.amount, 0);

    return { addedToday, monthlyAdded, openShops, monthlyDeposits };
  }, [user, dailyAddedClients, clients, deposits]);


  const saveReportData = useCallback(async (updatedClientInfoList: ClientInformation[]) => {
    const docRef = getReportDocRef();
    if (!docRef) return;
    try {
        await setDoc(docRef, { clients: updatedClientInfoList, lastUpdated: Timestamp.now() }, { merge: true });
    } catch (error) {
        console.error("Failed to save report data:", error);
        toast({ title: "Save Error", description: "Failed to save report progress.", variant: "destructive" });
    }
  }, [getReportDocRef, toast]);


  const addClient = useCallback(() => {
    const newClient: ClientInformation = {
      id: new Date().getTime().toString(),
      shopId: '',
      assets: '',
      clientDetails: '',
      conversationSummary: '',
      planForTomorrow: '',
      isCollapsed: false,
    };
    setClientInfoList(prevList => {
      const updatedList = [...prevList, newClient];
      saveReportData(updatedList);
      return updatedList;
    });
  }, [saveReportData]);
  
  const removeClient = useCallback((id: string) => {
    setClientInfoList(prevList => {
        const updatedList = prevList.filter(client => client.id !== id);
        saveReportData(updatedList);
        return updatedList;
    });
  }, [saveReportData]);
  
  const handleClientInfoChange = useCallback((id: string, field: keyof Omit<ClientInformation, 'id' | 'isCollapsed'>, value: string) => {
    setClientInfoList(prevList => {
        const updatedList = prevList.map(client =>
          client.id === id ? { ...client, [field]: value } : client
        );
        // Debounce this in a real app if performance is an issue
        saveReportData(updatedList);
        return updatedList;
    });
  }, [saveReportData]);

  const toggleClientCollapse = useCallback((id: string) => {
    setClientInfoList(prevList => 
        prevList.map(client =>
            client.id === id ? { ...client, isCollapsed: !client.isCollapsed } : client
        )
    );
  }, []);

  const getProgress = useCallback((client: ClientInformation) => {
    const requiredFields: (keyof Omit<ClientInformation, 'id'| 'isCollapsed' | 'shopId' | 'assets' | 'clientDetails'>)[] = ['conversationSummary', 'planForTomorrow'];
    const filledCount = requiredFields.filter(field => client[field].trim() !== '').length;
    return (filledCount / requiredFields.length) * 100;
  }, []);

  const handleGenerateReport = useCallback(() => {
    if (!user) {
        toast({ title: "User not found", description: "Please log in to generate a report.", variant: "destructive" });
        return;
    }

    const isAnyClientInfoFilled = clientInfoList.some(c => c.conversationSummary.trim() || c.planForTomorrow.trim());
    if (!isAnyClientInfoFilled) {
        toast({ title: "No client information", description: "Please fill in some client information before generating a report.", variant: "destructive" });
        return;
    }
    
    const today = new Date();
    const dateString = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    const reportParts = [
        `Agent Report - ${dateString}`,
        '',
        'AGENT INFORMATION:',
        `Name: ${user.name}`,
        `Added Client Today: ${agentStats.addedToday}`,
        `Monthly Client Added: ${agentStats.monthlyAdded}`,
        `Open Shops: ${agentStats.openShops}`,
        `Deposits: $${agentStats.monthlyDeposits.toFixed(2)}`,
        '',
        'CLIENT INFORMATION:',
        '',
    ];

    clientInfoList.forEach((client, index) => {
        if(client.conversationSummary.trim() || client.planForTomorrow.trim()) {
            reportParts.push(`CLIENT ${index + 1}:`);
            reportParts.push(`Shop ID: ${client.shopId || 'None'}`);
            reportParts.push(`Client Details: ${client.clientDetails || 'None'}`);
            reportParts.push(`Assets: ${client.assets || 'None'}`);
            reportParts.push(`Conversation Summary: ${client.conversationSummary}`);
            reportParts.push(`Plan for Tomorrow: ${client.planForTomorrow}`);
            reportParts.push('');
        }
    });

    setGeneratedReport(reportParts.join('\n'));
    setReportCardCollapsed(false);
    toast({ title: "Report Generated", description: "The report has been successfully generated." });
  }, [user, clientInfoList, agentStats, toast]);
  
  const handleClearReport = useCallback(() => setGeneratedReport(''), []);

  const handleCopyReport = useCallback(() => {
      if (!generatedReport) {
          toast({ title: "Nothing to copy", description: "Generate a report first.", variant: "destructive" });
          return;
      }
      navigator.clipboard.writeText(generatedReport);
      toast({ title: "Report Copied", description: "The report has been copied to your clipboard." });
  }, [generatedReport, toast]);

  const handleExportJson = useCallback(() => {
      if (!user || clientInfoList.every(c => !c.conversationSummary.trim() && !c.planForTomorrow.trim())) {
          toast({ title: "No data to export", description: "Please fill in client info first.", variant: "destructive"});
          return;
      }
      const data = {
          agent: user.name,
          stats: agentStats,
          clients: clientInfoList.map(({isCollapsed, ...rest}) => rest), // Don't export UI state
          exportedAt: new Date().toISOString(),
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `report_${user.name}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast({ title: "JSON Exported", description: "The report data has been exported." });
  }, [user, clientInfoList, agentStats, toast]);
  
  const handleImportJson = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text === 'string') {
                  const data = JSON.parse(text);
                  if (data.agent && data.clients && data.agent === user.name) {
                      const importedClients = data.clients.map((c: any, i: number) => ({...c, id: c.id || new Date().getTime().toString() + i, isCollapsed: false}));
                      setClientInfoList(importedClients);
                      saveReportData(importedClients);
                      toast({ title: "JSON Imported", description: "Report data has been successfully imported." });
                  } else {
                      throw new Error("Invalid JSON format or data for another agent.");
                  }
              }
          } catch (error: any) {
              toast({ title: "Import Failed", description: error.message || "The selected file is not a valid report JSON.", variant: "destructive" });
          }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input
  }, [user, saveReportData, toast]);
  
  if (authLoading || dataLoading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="w-full h-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Generate your daily performance report.
          </p>
        </div>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>My Performance Statistics</CardTitle>
                <CardDescription>This data is automatically calculated for the current month.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/>Added Client Today</Label>
                            <Input value={agentStats.addedToday} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/>Monthly Client Added</Label>
                            <Input value={agentStats.monthlyAdded} readOnly disabled/>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground"><BarChart className="h-4 w-4"/>Open Shops</Label>
                            <Input value={agentStats.openShops} readOnly disabled/>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground"><Banknote className="h-4 w-4"/>Deposits</Label>
                            <Input value={`$${agentStats.monthlyDeposits.toFixed(2)}`} readOnly disabled/>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Client Information</CardTitle>
                <CardDescription>Enter details for each client you interacted with today. Your work is saved automatically.</CardDescription>
            </div>
            <Button variant="outline" onClick={addClient}>
                <Plus className="mr-2 h-4 w-4"/> Add Client
            </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isReportDataLoading ? (
                    <div className="flex items-center justify-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : clientInfoList.length > 0 ? (
                    clientInfoList.map((client, index) => (
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
                                            <Select 
                                                value={client.shopId} 
                                                onValueChange={(value) => handleClientInfoChange(client.id, 'shopId', value)}
                                                disabled={!user}
                                            >
                                                <SelectTrigger id={`shopId-${client.id}`}>
                                                    <SelectValue placeholder="Select a shop ID" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {agentClients.map(c => (
                                                        <SelectItem key={c.id} value={c.shopId}>
                                                            {c.shopId} - ({c.clientName})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-8">No client entries for today's report.</div>
                )}
                <Button variant="outline" onClick={addClient} className="w-full">
                    <Plus className="mr-2 h-4 w-4"/> Add Another Client
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row justify-between items-center cursor-pointer" onClick={() => setReportCardCollapsed(!isReportCardCollapsed)}>
                <div>
                    <CardTitle className="flex items-center"><FileText className="mr-2"/>Generate Your Report</CardTitle>
                    <CardDescription>Click here to create, export, and manage your completed report</CardDescription>
                </div>
                <Button variant="ghost" size="sm">{isReportCardCollapsed ? <ChevronDown/> : <ChevronUp/>} {isReportCardCollapsed ? 'Show' : 'Hide'}</Button>
            </CardHeader>
            {!isReportCardCollapsed && (
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Button onClick={handleGenerateReport}><FileText className="mr-2 h-4 w-4" />Generate Report</Button>
                        <Button variant="outline" onClick={handleClearReport}><RefreshCw className="mr-2 h-4 w-4" />Clear</Button>
                        <Button variant="outline" onClick={() => {toast({title: "Coming Soon!", description: "Translation feature will be available shortly."})}}><Languages className="mr-2 h-4 w-4" />Translate</Button>
                        <Button variant="outline" onClick={handleCopyReport}><Copy className="mr-2 h-4 w-4" />Copy</Button>
                        <Button variant="outline" onClick={handleExportJson}><Download className="mr-2 h-4 w-4" />Export JSON</Button>
                        <Button variant="outline" asChild>
                            <Label htmlFor="import-json" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />Import JSON
                                <Input id="import-json" type="file" className="hidden" accept=".json" onChange={handleImportJson}/>
                            </Label>
                        </Button>
                    </div>
                    <Textarea 
                        value={generatedReport}
                        readOnly
                        placeholder="Your generated report will appear here..."
                        className="min-h-[200px] bg-muted"
                    />
                </CardContent>
            )}
        </Card>
    </div>
  )
}


export default withAuth(ReportingPage, ['Agent', 'Admin', 'Superadmin']);
