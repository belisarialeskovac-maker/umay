
"use client"

import React, { useState, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { DeviceInventory } from "../page"
import { format } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox"

type InventoryTableProps = {
  devices: DeviceInventory[]
  onDelete: (id: string) => Promise<boolean>
  onUpdate: (id: string, updatedDevice: Partial<DeviceInventory>) => Promise<boolean>
  searchTerm: string
  setSearchTerm: (term: string) => void
  agentNames: string[],
  selectedDevices: string[],
  onSelectAll: (checked: boolean) => void,
  onSelectDevice: (deviceId: string, checked: boolean) => void,
  canManage: boolean
}

const editFormSchema = z.object({
  agent: z.string().min(1, "Agent is required."),
  imei: z.string().min(15, "IMEI must be 15 characters.").max(17, "IMEI must be 17 characters."),
  model: z.string().min(1, "Model is required."),
  color: z.string().min(1, "Color is required."),
  username: z.string().optional(),
  password: z.string().optional(),
  remarks: z.string().optional(),
})

function InventoryTable({
  devices,
  onDelete,
  onUpdate,
  searchTerm,
  setSearchTerm,
  agentNames,
  selectedDevices,
  onSelectAll,
  onSelectDevice,
  canManage
}: InventoryTableProps) {
  const [editingDevice, setEditingDevice] = useState<DeviceInventory | null>(null)
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null)

  const form = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  })

  const handleEditClick = useCallback((device: DeviceInventory) => {
    setEditingDevice(device)
    form.reset({
      agent: device.agent,
      imei: device.imei,
      model: device.model,
      color: device.color,
      username: device.appleIdUsername || "",
      password: device.appleIdPassword || "",
      remarks: device.remarks || "",
    })
  }, [form]);

  const handleUpdateSubmit = useCallback(async (values: z.infer<typeof editFormSchema>) => {
    if (!editingDevice) return
    const updateData = {
        ...values,
        appleIdUsername: values.username,
        appleIdPassword: values.password
    };
    const success = await onUpdate(editingDevice.id, updateData)
    if (success) {
      setEditingDevice(null)
    }
  }, [editingDevice, onUpdate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingDeviceId) return
    await onDelete(deletingDeviceId)
    setDeletingDeviceId(null)
  }, [deletingDeviceId, onDelete]);

  const isAllSelected = devices.length > 0 && selectedDevices.length === devices.length;

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && (
                <TableHead>
                  <Checkbox 
                    onCheckedChange={(checked) => onSelectAll(Boolean(checked))} 
                    checked={isAllSelected}
                  />
                </TableHead>
              )}
              <TableHead>Agent</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.length > 0 ? (
              devices.map((device) => (
                <TableRow key={device.id} data-state={selectedDevices.includes(device.id) && "selected"}>
                  {canManage && (
                    <TableCell>
                      <Checkbox 
                        onCheckedChange={(checked) => onSelectDevice(device.id, Boolean(checked))} 
                        checked={selectedDevices.includes(device.id)} 
                      />
                    </TableCell>
                  )}
                  <TableCell>{device.agent}</TableCell>
                  <TableCell>{device.imei}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell>{device.color}</TableCell>
                  <TableCell>{device.appleIdUsername || "N/A"}</TableCell>
                  <TableCell>{device.appleIdPassword || "N/A"}</TableCell>
                  <TableCell>{device.remarks || "N/A"}</TableCell>
                  <TableCell>{format(new Date(device.updatedAt), "PPP p")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(device)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingDeviceId(device.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Make changes to the device details here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                      control={form.control}
                      name="agent"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Agent</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder="Select an agent" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {agentNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                  {name}
                              </SelectItem>
                              ))}
                          </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="imei"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>IMEI</FormLabel>
                          <FormControl>
                          <Input {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                          <Input {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                          <Input {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                          <Input {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                          <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                      <FormItem className="md:col-span-2">
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                          <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditingDevice(null)}>Cancel</Button>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDeviceId} onOpenChange={(open) => !open && setDeletingDeviceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the device
              from the inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default React.memo(InventoryTable);
