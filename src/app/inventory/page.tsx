
"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import InventoryTable from "./components/inventory-table"
import AddDeviceForm from "./components/add-device-form"
import AgentStatistics from "./components/agent-statistics"

export type DeviceInventory = {
  id: string
  agent: string
  imei: string
  model: string
  color: string
  appleIdUsername?: string
  appleIdPassword?: string
  remarks?: string
  createdAt: string
  updatedAt: string
}

export type AgentStats = {
  [key: string]: number
}

type Agent = {
    name: string;
}

export default function InventoryPage() {
  const [devices, setDevices] = useState<DeviceInventory[]>([])
  const [filteredDevices, setFilteredDevices] = useState<DeviceInventory[]>([])
  const [agentStats, setAgentStats] = useState<AgentStats>({})
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("inventory")
  const { toast } = useToast()

  useEffect(() => {
    setLoading(true)
    try {
      const storedInventory = localStorage.getItem("inventory")
      const storedAgents = localStorage.getItem("agents");

      if (storedInventory) {
        const inventoryData: DeviceInventory[] = JSON.parse(storedInventory)
        setDevices(inventoryData)
        setFilteredDevices(inventoryData)
        updateAgentStats(inventoryData)
      }
      if (storedAgents) {
          setRegisteredAgents(JSON.parse(storedAgents));
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory data from your browser's storage.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, activeTab])

  const agentNames = useMemo(() => registeredAgents.map(a => a.name), [registeredAgents]);

  const updateAgentStats = (deviceData: DeviceInventory[]) => {
    const stats: AgentStats = {}
    deviceData.forEach((device) => {
      stats[device.agent] = (stats[device.agent] || 0) + 1
    })
    setAgentStats(stats)
  }

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDevices(devices)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = devices.filter((device) => {
        return (
          device.agent.toLowerCase().includes(term) ||
          device.imei.toLowerCase().includes(term) ||
          device.model.toLowerCase().includes(term) ||
          device.color.toLowerCase().includes(term) ||
          (device.appleIdUsername && device.appleIdUsername.toLowerCase().includes(term)) ||
          (device.appleIdPassword && device.appleIdPassword.toLowerCase().includes(term)) ||
          (device.remarks && device.remarks.toLowerCase().includes(term))
        )
      })
      setFilteredDevices(filtered)
    }
  }, [searchTerm, devices])

  const addDevice = async (device: Omit<DeviceInventory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const isDuplicate = devices.some((d) => d.imei === device.imei)
      if (isDuplicate) {
        toast({
          title: "Error",
          description: "This IMEI already exists in the inventory",
          variant: "destructive",
        })
        return false
      }

      const newDevice: DeviceInventory = {
        ...device,
        id: new Date().getTime().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const updatedDevices = [...devices, newDevice]
      localStorage.setItem("inventory", JSON.stringify(updatedDevices))
      setDevices(updatedDevices)
      setFilteredDevices(updatedDevices)
      updateAgentStats(updatedDevices);


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
  }

  const updateDevice = async (id: string, updatedDevice: Partial<DeviceInventory>) => {
    try {
      if (updatedDevice.imei) {
        const isDuplicate = devices.some((d) => d.id !== id && d.imei === updatedDevice.imei)
        if (isDuplicate) {
          toast({
            title: "Error",
            description: "This IMEI already exists in the inventory",
            variant: "destructive",
          })
          return false
        }
      }
      
      const updatedDevices = devices.map(d => {
        if (d.id === id) {
            return {
                ...d,
                ...updatedDevice,
                updatedAt: new Date().toISOString(),
            }
        }
        return d;
      });

      localStorage.setItem("inventory", JSON.stringify(updatedDevices));
      setDevices(updatedDevices);
      setFilteredDevices(updatedDevices);
      updateAgentStats(updatedDevices);

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
  }

  const deleteDevice = async (id: string) => {
    try {
      const updatedDevices = devices.filter(d => d.id !== id);
      localStorage.setItem("inventory", JSON.stringify(updatedDevices));
      setDevices(updatedDevices);
      setFilteredDevices(updatedDevices);
      updateAgentStats(updatedDevices);

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
  }

  return (
    <div className="w-full h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Device Inventory Management</h1>
        <p className="text-muted-foreground">Track and manage all your devices in one place</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="add-device">Add New Device</TabsTrigger>
          <TabsTrigger value="stats">Agent Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Device Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-40 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <InventoryTable
                    devices={filteredDevices}
                    onDelete={deleteDevice}
                    onUpdate={updateDevice}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    agentNames={agentNames}
                />
              )}
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

        <TabsContent value="stats">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Agent Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-40 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <AgentStatistics agentStats={agentStats} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
