
'use server';
/**
 * @fileOverview A client details parsing AI agent.
 *
 * - parseClientDetails - A function that handles parsing unstructured client data.
 * - ClientDetailsInput - The input type for the parseClientDetails function.
 * - ClientDetailsOutput - The return type for the parseClientDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClientDetailsInputSchema = z.object({
    details: z.string().describe('The unstructured client details.'),
});
export type ClientDetailsInput = z.infer<typeof ClientDetailsInputSchema>;

const ClientDetailsOutputSchema = z.object({
  name: z.string().describe("The client's full name."),
  age: z.number().describe("The client's age as a number."),
  location: z.string().describe("The client's location."),
  work: z.string().describe("The client's work or occupation."),
});
export type ClientDetailsOutput = z.infer<typeof ClientDetailsOutputSchema>;

export async function parseClientDetails(input: ClientDetailsInput): Promise<ClientDetailsOutput> {
  const result = await parseClientDetailsFlow(input);
  // The schema has `name` but the prompt asks for `clientName`, so we need to map it.
  return {
    name: (result as any).clientName,
    age: result.age,
    location: result.location,
    work: result.work,
  };
}

const prompt = ai.definePrompt({
  name: 'parseClientDetailsPrompt',
  input: {schema: ClientDetailsInputSchema},
  output: {
    schema: z.object({
      clientName: z.string().describe("The client's full name."),
      age: z.number().describe("The client's age as a number, stripping any extra text like 'yrs old'."),
      location: z.string().describe("The client's location."),
      work: z.string().describe("The client's work or occupation."),
    }),
  },
  prompt: `Parse the following client details into a structured format. The input can have various labels like "Name", "Client Name", "Loc", "Location", "Work", or "Occupation". The order of fields may vary.

You must handle all possible input orders and variations of field names. Extract the age as a number, stripping any extra text.

Client Details:
{{{details}}}

Here are some examples of how to handle different formats:

---
Input:
Client Name: Jason
Age: 40
Work: Captain in a cruise ship
Location: UAE
Output:
{
  "clientName": "Jason",
  "age": 40,
  "work": "Captain in a cruise ship",
  "location": "UAE"
}
---
Input:
NAME: ABDULKARIM ACON
AGE: 54
LOC: PH
WORK: ONLINE BUSINESS of HEALTH & WELLNESS
Output:
{
  "clientName": "ABDULKARIM ACON",
  "age": 54,
  "location": "PH",
  "work": "ONLINE BUSINESS of HEALTH & WELLNESS"
}
---
Input:
Name: Rey Viray
Age: 59yrs old
Loc: Bulacan, Philippines 
Occupation: Retired PNP
Output:
{
  "clientName": "Rey Viray",
  "age": 59,
  "location": "Bulacan, Philippines",
  "work": "Retired PNP"
}
---
Input:
name: constante
age: 49
work: working at yacht 
location: FRANCE 10 YEARS (CAVITE)
Output:
{
    "clientName": "constante",
    "age": 49,
    "work": "working at yacht",
    "location": "FRANCE 10 YEARS (CAVITE)"
}
---
Input:
Client Name: Simbad Lugo
Age: 55
Work: Seaman/Marine Engineering, for good in PH to start a business
Location: Davao
Output:
{
    "clientName": "Simbad Lugo",
    "age": 55,
    "work": "Seaman/Marine Engineering, for good in PH to start a business",
    "location": "Davao"
}
---
`,
});

const parseClientDetailsFlow = ai.defineFlow(
  {
    name: 'parseClientDetailsFlow',
    inputSchema: ClientDetailsInputSchema,
    outputSchema: ClientDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
