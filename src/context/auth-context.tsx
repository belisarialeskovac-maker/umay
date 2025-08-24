
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'Agent' | 'Admin' | 'Superadmin';
  agentType: string;
  dateHired: Date;
  status: 'Active' | 'Pending' | 'Rejected';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        setLoading(true); // Set loading while we fetch profile
        try {
          const agentRef = doc(db, 'agents', firebaseUser.uid);
          const agentSnap = await getDoc(agentRef);
          if (agentSnap.exists()) {
            const agentData = agentSnap.data();

            if (agentData.status === 'Pending') {
                toast({
                    title: "Account Pending Approval",
                    description: "Your account is waiting for an admin to approve it.",
                    variant: "destructive"
                });
                await signOut(auth);
                // No need to setUser(null) as onAuthStateChanged will refire with null
            } else if (agentData.status === 'Rejected') {
                 toast({
                    title: "Account Rejected",
                    description: "Your account has been rejected. Please contact an administrator.",
                    variant: "destructive"
                });
                await signOut(auth);
            } else {
                setUser({
                    uid: firebaseUser.uid,
                    email: agentData.email,
                    name: agentData.name,
                    role: agentData.role,
                    agentType: agentData.agentType,
                    status: agentData.status,
                    dateHired: (agentData.dateHired as Timestamp).toDate(),
                });
            }
          } else {
            // This can happen briefly during signup before the Firestore doc is created.
            // Let's not log out immediately, but wait for next state change.
            console.warn(`No profile found in Firestore for user ${firebaseUser.uid}, will re-check.`);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          await signOut(auth);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, toast, router]);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    router.push('/login');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
