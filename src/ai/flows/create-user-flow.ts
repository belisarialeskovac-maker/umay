
'use server';
/**
 * @fileOverview A flow for creating a Firebase Authentication user.
 * This is intended to be used by an Admin to create accounts for new agents.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { initFirebase } from '@/lib/firebase-admin';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const CreateUserOutputSchema = z.object({
  uid: z.string(),
});

export async function createUser(
  input: z.infer<typeof CreateUserInputSchema>
): Promise<z.infer<typeof CreateUserOutputSchema>> {
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    initFirebase(); // Ensure Firebase Admin is initialized
    const auth = getAuth();

    try {
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        emailVerified: false, // Or true, depending on your flow
        disabled: false,
      });

      return {
        uid: userRecord.uid,
      };
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new Error("An account with this email address already exists.");
        }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
);

    