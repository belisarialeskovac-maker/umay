
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User as UserIcon } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, deleteDoc, query, where, doc, serverTimestamp, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"

import InventoryTable from "./components/inventory-table"
import AddDeviceForm from "./components/add-device-form"
import AgentStatistics from "./components/agent-statistics"
import { useData } from "@/context/data-context"
import { useAuth } from "@/context/auth-context"
import withAuth from "@/components/with-auth"
import type { DeviceInventory } from "@/context/data-context"

export type AgentStats = {
  [key: string]: number
}

function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { inventory: allDevices, agents, loading: dataLoading } = useData();
  
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("inventory")
  const { toast } = useToast()

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

  if (authLoading || dataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isAgent = user?.role === 'Agent';

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Device Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage all your devices in one place</p>
        </div>
        {isAgent && (
            <Button asChild variant="outline">
                <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" /> Back to Profile
                </Link>
            </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full" style={{ gridTemplateColumns: isAgent ? '1fr 1fr' : '1fr 1fr 1fr' }}>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="add-device">Add New Device</TabsTrigger>
          {!isAgent && <TabsTrigger value="stats">Agent Statistics</TabsTrigger>}
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Device Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryTable
                  devices={filteredDevices}
                  onDelete={deleteDevice}
                  onUpdate={updateDevice}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  agentNames={agentNames}
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Agent Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <AgentStatistics agentStats={agentStats} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default withAuth(InventoryPage, ['Agent', 'Admin', 'Superadmin']);
