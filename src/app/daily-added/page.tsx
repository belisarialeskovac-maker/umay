
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { User, ClipboardList, Calendar, Briefcase, MapPin, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { parseClientDetails } from '@/ai/flows/parse-client-details';

const agentSchema = z.object({
  name: z.string(),
  email: z.string(),
  dateHired: z.date(),
  agentType: z.string(),
});

type Agent = z.infer<typeof agentSchema>;

const clientSchema = z.object({
  name: z.string(),
  age: z.number(),
  location: z.string(),
  work: z.string(),
  assignedAgent: z.string(),
  date: z.date(),
});

type Client = z.infer<typeof clientSchema>;

export default function DailyAddedPage() {
  const [pastedDetails, setPastedDetails] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredAgents, setRegisteredAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const { toast } = useToast();

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

  const handleProcess = async () => {
    if (!pastedDetails.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste client details before processing.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedAgent) {
        toast({
          title: 'Error',
          description: 'Please select an agent.',
          variant: 'destructive',
        });
        return;
      }

    setIsLoading(true);
    try {
      const parsedData = await parseClientDetails({ details: pastedDetails });
      if (parsedData && parsedData.name) {
        const newClient: Client = {
          ...parsedData,
          assignedAgent: selectedAgent,
          date: new Date(),
        };
        setClients((prevClients) => [...prevClients, newClient]);
        setPastedDetails('');
        toast({
          title: 'Client Added',
          description: `${parsedData.name} has been successfully added to the list.`,
        });
      } else {
        throw new Error('Failed to parse client details.');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to parse client details. Please check the format and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Process New Client</CardTitle>
          <CardDescription>Paste raw client information in the text area below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Textarea
              value={pastedDetails}
              onChange={(e) => setPastedDetails(e.target.value)}
              placeholder={`Client Name: Jason\nAge: 40\nWork: Captain in a cruise ship\nLocation: UAE`}
              className="md:col-span-2 min-h-[150px]"
            />
             <div className="space-y-4">
                <Select onValueChange={setSelectedAgent} value={selectedAgent}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an Assigned Agent" />
                    </SelectTrigger>
                    <SelectContent>
                        {registeredAgents.map((agent) => (
                        <SelectItem key={agent.name} value={agent.name}>
                            {agent.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Button onClick={handleProcess} disabled={isLoading} className="w-full">
                    {isLoading ? 'Processing...' : 'Process Details'}
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              No Clients Added Today
            </h2>
            <p className="text-muted-foreground mt-2">
              Processed clients will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
