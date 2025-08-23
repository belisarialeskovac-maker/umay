
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { User, ClipboardList, Calendar, Briefcase, MapPin, UserPlus, TextSearch } from 'lucide-react';

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

export default function DailyAddedPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([]);
  const [pastedDetails, setPastedDetails] = useState('');
  const { toast } = useToast();

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
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

        const name = nameMatch ? nameMatch[1].trim() : '';
        const age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
        const location = locMatch ? locMatch[1].trim() : '';
        const work = workMatch ? workMatch[1].trim() : '';

        if (!name || !age || !location || !work) {
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

        setClients((prevClients) => [...prevClients, newClient]);
        toast({
          title: 'Client Added',
          description: `${name} has been successfully added to the list.`,
        });
        form.reset({ assignedAgent: "" });
        setPastedDetails('');

    } catch (error: any) {
        toast({
            title: 'Parsing Failed',
            description: error.message || 'Please ensure the pasted text is in the correct format with labels like "Name:", "Age:", "Location:", "Work:".',
            variant: 'destructive',
        });
    }
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Added Clients</h1>
          <p className="text-muted-foreground mt-1">
            Paste client details to add them to the daily list.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center"><TextSearch className="mr-2 h-5 w-5" /> Parsing Area</h2>
                <div className='space-y-4'>
                    <Form {...form}>
                        <form className="space-y-4">
                             <div>
                                <FormLabel htmlFor="pasted-details">1. Paste Client Details Here</FormLabel>
                                <Textarea 
                                    id="pasted-details"
                                    placeholder="e.g.&#10;Client Name: Jason&#10;Age: 40&#10;Work: Captain in a cruise ship&#10;Location: UAE"
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
                                    <Select onValueChange={field.onChange} value={field.value}>
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
        </div>
        
        <div>
            <h2 className="text-xl font-semibold mb-4">Today's Clients</h2>
            {clients.length > 0 ? (
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
                <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[60vh]">
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
      </div>
    </div>
  );
}
