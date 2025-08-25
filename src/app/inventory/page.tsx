
"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User as UserIcon, Upload, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, deleteDoc, query, where, doc, serverTimestamp, getDocs, writeBatch } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import Papa from "papaparse";


import InventoryTable from "./components/inventory-table"
import AddDeviceForm from "./components/add-device-form"
import AgentStatistics from "./components/agent-statistics"
import { useData } from "@/context/data-context"
import { useAuth } from "@/context/auth-context"
import withAuth from "@/components/with-auth"
import type { DeviceInventory } from "@/context/data-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export type AgentStats = {
  [key: string]: number
}

type PreviewRow = {
    data: any;
    status: 'Ready to Import' | 'Duplicate IMEI' | 'Invalid Data';
    reason?: string;
}

function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { inventory: allDevices, agents, loading: dataLoading } = useData();
  
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("inventory")
  const { toast } = useToast()
  
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [bulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false);


  const userVisibleDevices = useMemo(() => {
    if (dataLoading || !user) return [];
    if (user.role === 'Agent') {
      return allDevices.filter(d => d.agent === user.name);
    }
    return allDevices;
  }, [allDevices, user, dataLoading]);
  
  const agentNames = useMemo(() => agents.map(a => a.name), [agents]);
  
  const agentStats = useMemo(() => {
    const stats: AgentStats = {};
    userVisibleDevices.forEach((device) => {
        stats[device.agent] = (stats[device.agent] || 0) + 1;
    });
    return stats;
  }, [userVisibleDevices]);

  const filteredDevices = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term === "") {
      return userVisibleDevices;
    }
    return userVisibleDevices.filter((device) =>
      Object.values(device).some(value => 
        String(value).toLowerCase().includes(term)
      )
    );
  }, [searchTerm, userVisibleDevices]);

  const addDevice = useCallback(async (device: Omit<DeviceInventory, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
        toast({title: "Error", description: "You must be logged in.", variant: "destructive"});
        return false;
    }
    
    const deviceToAdd = {
        ...device,
        agent: user.role === 'Agent' ? user.name : device.agent,
    };
    
    if(!deviceToAdd.agent){
        toast({title: "Error", description: "Agent is required.", variant: "destructive"});
        return false;
    }

    try {
      const q = query(collection(db, "inventory"), where("imei", "==", deviceToAdd.imei));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({
          title: "Error",
          description: "This IMEI already exists in the inventory",
          variant: "destructive",
        })
        return false
      }

      const newDevice = {
        ...deviceToAdd,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      await addDoc(collection(db, "inventory"), newDevice);

      toast({
        title: "Success",
        description: "Device added successfully",
      })

      setActiveTab("inventory")
      return true
    } catch (error) {
      console.error("Error adding device:", error)
      toast({
        title: "Error",
        description: "Failed to add device: " + (error as Error).message,
        variant: "destructive",
      })
      return false
    }
  }, [user, toast]);

  const updateDevice = useCallback(async (id: string, updatedDeviceData: Partial<Omit<DeviceInventory, 'id'>>) => {
    try {
      if (updatedDeviceData.imei) {
        const q = query(collection(db, "inventory"), where("imei", "==", updatedDeviceData.imei));
        const querySnapshot = await getDocs(q);
        const isDuplicate = !querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== id);
        if (isDuplicate) {
          toast({
            title: "Error",
            description: "This IMEI already exists in the inventory",
            variant: "destructive",
          })
          return false
        }
      }
      
      const deviceRef = doc(db, "inventory", id);
      await updateDoc(deviceRef, {
        ...updatedDeviceData,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Device updated successfully",
      })
      return true
    } catch (error) {
      console.error("Error updating device:", error)
      toast({
        title: "Error",
        description: "Failed to update device: " + (error as Error).message,
        variant: "destructive",
      })
      return false
    }
  }, [toast]);

  const deleteDevice = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "inventory", id));
      toast({
        title: "Success",
        description: "Device deleted successfully",
      })
      return true
    } catch (error) {
      console.error("Error deleting device:", error)
      toast({
        title: "Error",
        description: "Failed to delete device: " + (error as Error).message,
        variant: "destructive",
      })
      return false
    }
  }, [toast]);
  
  const handleBulkDelete = useCallback(async () => {
    const batch = writeBatch(db);
    selectedDevices.forEach(id => {
      batch.delete(doc(db, "inventory", id));
    });
    try {
      await batch.commit();
      toast({ title: "Devices Deleted", description: `${selectedDevices.length} devices have been deleted.` });
      setSelectedDevices([]);
    } catch(error: any) {
      toast({ title: "Error", description: "Failed to delete selected devices.", variant: "destructive" });
    }
    setBulkDeleteAlertOpen(false);
  }, [selectedDevices, toast]);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedDevices(checked ? filteredDevices.map(d => d.id) : []);
  }, [filteredDevices]);

  const handleSelectDevice = useCallback((deviceId: string, checked: boolean) => {
    setSelectedDevices(prev => checked ? [...prev, deviceId] : prev.filter(id => id !== deviceId));
  }, []);

  const handleCsvUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const requiredHeaders = ["agent", "imei", "model", "color", "appleIdUsername", "appleIdPassword", "remarks"];
            if (!requiredHeaders.every(h => results.meta.fields?.map(f => f.toLowerCase()).includes(h))) {
                toast({
                    title: "Invalid CSV Format",
                    description: `CSV must contain headers: ${requiredHeaders.join(", ")}`,
                    variant: "destructive"
                });
                return;
            }

            const existingImeis = new Set(allDevices.map(d => d.imei));
            const agentMap = new Map(agents.map(a => [a.name.toLowerCase(), a.name]));

            const validatedData = (results.data as any[]).map(row => {
                if (existingImeis.has(row.imei)) {
                    return { data: row, status: 'Duplicate IMEI' as const, reason: `IMEI '${row.imei}' already exists.` };
                }

                const agentNameLower = row.agent?.toLowerCase();
                const matchedAgentName = agentMap.get(agentNameLower);

                if (!matchedAgentName) {
                    return { data: row, status: 'Invalid Data' as const, reason: `Agent '${row.agent}' not found.` };
                }

                if (!row.imei || !row.model || !row.color) {
                    return { data: row, status: 'Invalid Data' as const, reason: 'Missing required fields (imei, model, color).' };
                }

                const finalData = {
                    agent: matchedAgentName,
                    imei: row.imei,
                    model: row.model,
                    color: row.color,
                    appleIdUsername: row.appleIdUsername || "",
                    appleIdPassword: row.appleIdPassword || "",
                    remarks: row.remarks || "",
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
  }, [allDevices, agents, toast]);

  const handleConfirmImport = useCallback(async () => {
    setIsImporting(true);
    const batch = writeBatch(db);
    let importedCount = 0;
    
    previewData.forEach(row => {
        if(row.status === 'Ready to Import') {
            const deviceRef = doc(collection(db, "inventory"));
            batch.set(deviceRef, {
                ...row.data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            importedCount++;
        }
    });

    if (importedCount === 0) {
        toast({ title: "No Devices to Import", description: "There are no valid new devices to import.", variant: "destructive"});
        setIsImporting(false);
        setPreviewDialogOpen(false);
        return;
    }

    try {
        await batch.commit();
        toast({
            title: "Import Complete",
            description: `${importedCount} devices imported successfully.`,
        });
    } catch (error) {
        toast({ title: "Import Error", description: "An error occurred during the batch import.", variant: "destructive" });
    } finally {
        setIsImporting(false);
        setPreviewDialogOpen(false);
        setPreviewData([]);
    }
  }, [previewData, toast]);


  if (authLoading || dataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isAgent = user?.role === 'Agent';
  const canManage = user?.role === 'Admin' || user?.role === 'Superadmin';
  const readyToImportCount = useMemo(() => previewData.filter(row => row.status === 'Ready to Import').length, [previewData]);


  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Device Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage all your devices in one place</p>
        </div>
        <div className="flex items-center gap-2">
            {isAgent && (
                <Button asChild variant="outline">
                    <Link href="/profile">
                        <UserIcon className="mr-2 h-4 w-4" /> Back to Profile
                    </Link>
                </Button>
            )}
            {canManage && (
              <>
                <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Import CSV
                </Button>
                <input type="file" ref={csvInputRef} accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </>
            )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full" style={{ gridTemplateColumns: isAgent ? '1fr 1fr' : '1fr 1fr 1fr' }}>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="add-device">Add New Device</TabsTrigger>
          {!isAgent && <TabsTrigger value="stats">Agent Statistics</TabsTrigger>}
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div>
                <CardTitle>Device Inventory</CardTitle>
                <CardDescription>{filteredDevices.length} devices in total.</CardDescription>
              </div>
              {canManage && selectedDevices.length > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setBulkDeleteAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedDevices.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <InventoryTable
                  devices={filteredDevices}
                  onDelete={deleteDevice}
                  onUpdate={updateDevice}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  agentNames={agentNames}
                  selectedDevices={selectedDevices}
                  onSelectAll={handleSelectAll}
                  onSelectDevice={handleSelectDevice}
                  canManage={canManage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-device">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Add New Device</CardTitle>
            </CardHeader>
            <CardContent>
              <AddDeviceForm onSubmit={addDevice} agentNames={agentNames} />
            </CardContent>
          </Card>
        </TabsContent>

        {!isAgent && (
          <TabsContent value="stats">
             <AgentStatistics agentStats={agentStats} />
          </TabsContent>
        )}
      </Tabs>
      
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
                                <TableHead>Agent</TableHead>
                                <TableHead>IMEI</TableHead>
                                <TableHead>Model</TableHead>
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
                                    <TableCell>{row.data.agent}</TableCell>
                                    <TableCell>{row.data.imei}</TableCell>
                                    <TableCell>{row.data.model}</TableCell>
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

        <AlertDialog open={bulkDeleteAlertOpen} onOpenChange={setBulkDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the selected {selectedDevices.length} device records.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}

export default withAuth(InventoryPage, ['Agent', 'Admin', 'Superadmin']);
