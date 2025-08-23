
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { DeviceInventory } from "../page"

const formSchema = z.object({
  agent: z.string().min(1, "Agent is required."),
  imei: z.string().min(15, "IMEI must be at least 15 characters.").max(17, "IMEI must be at most 17 characters."),
  model: z.string().min(1, "Model is required."),
  color: z.string().min(1, "Color is required."),
  appleIdUsername: z.string().optional(),
  appleIdPassword: z.string().optional(),
  remarks: z.string().optional(),
})

type AddDeviceFormProps = {
  onSubmit: (device: Omit<DeviceInventory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  agentNames: string[]
}

export default function AddDeviceForm({ onSubmit, agentNames }: AddDeviceFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agent: "",
      imei: "",
      model: "",
      color: "",
      appleIdUsername: "",
      appleIdPassword: "",
      remarks: "",
    },
  })

  async function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const success = await onSubmit(values)
    if (success) {
      form.reset()
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Input placeholder="Enter device IMEI" {...field} />
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
                  <Input placeholder="e.g., iPhone 15 Pro" {...field} />
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
                  <Input placeholder="e.g., Titanium Blue" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="appleIdUsername"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apple ID Username (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Apple ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="appleIdPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apple ID Password (Optional)</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter Apple ID Password" {...field} />
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
                <FormLabel>Remarks (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional remarks..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Adding..." : "Add Device"}
        </Button>
      </form>
    </Form>
  )
}
