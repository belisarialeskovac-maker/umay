
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { User, ClipboardList, Calendar, Briefcase, MapPin, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

const agentSchema = z.object({
  name: z.string(),
  email: z.string(),
  dateHired: z.date(),
  agentType: z.string(),
});

type Agent = z.infer<typeof agentSchema>;

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  age: z.coerce.number().positive("Age must be a positive number."),
  location: z.string().min(1, "Location is required."),
  work: z.string().min(1, "Work is required."),
  assignedAgent: z.string().min(1, "An agent must be selected."),
});

type ClientForm = z.infer<typeof clientFormSchema>;

type Client = ClientForm & {
    date: Date;
};

export default function DailyAddedPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false)
  const { toast } = useToast();

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
        name: "",
        age: undefined,
        location: "",
        work: "",
        assignedAgent: "",
    },
  });

  useEffect(() => {
    const storedAgents = localStorage.getItem("agents");
    if (storedAgents) {
      const parsedAgents = JSON.parse(storedAgents).map((agent: any) => ({
        ...agent,
        dateHired: new Date(agent.dateHired),
      }));
      setRegisteredAgents(parsedAgents);
    }
  }, []);

  function onSubmit(values: ClientForm) {
    const newClient: Client = {
      ...values,
      date: new Date(),
    };
    setClients((prevClients) => [...prevClients, newClient]);
    toast({
      title: 'Client Added',
      description: `${values.name} has been successfully added to the list.`,
    });
    setOpen(false);
    form.reset();
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Added Clients</h1>
          <p className="text-muted-foreground mt-1">
            Add new clients to the daily list.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Client</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new client.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="40" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="UAE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="work"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work</FormLabel>
                      <FormControl>
                        <Input placeholder="Captain in a cruise ship" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                <DialogFooter>
                  <Button type="submit">Add Client</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length > 0 ? (
        <div className="rounded-lg border bg-card mt-6">
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
              {clients.map((client, index) => (
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
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh] mt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              No Clients Added Today
            </h2>
            <p className="text-muted-foreground mt-2">
              Added clients will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
