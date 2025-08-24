
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';

// --- Data Types ---

export type Agent = {
  id: string;
  uid: string;
  name: string;
  email: string;
  dateHired: Date;
  agentType: string;
  role: 'Agent' | 'Admin' | 'Superadmin';
};

export type Client = {
    id: string;
    shopId: string;
    clientName: string;
    agent: string;
    kycCompletedDate: Date;
    status: "In Process" | "Active" | "Eliminated";
    clientDetails: string;
}

export type DailyAddedClient = {
    id: string;
    name: string;
    age: number;
    location: string;
    work: string;
    assignedAgent: string;
    date: Date;
};

export type Transaction = {
    id: string;
    shopId: string;
    clientName: string;
    agent: string;
    date: Date;
    amount: number;
    paymentMode: string;
}
export type Deposit = Transaction;
export type Withdrawal = Transaction;

export type Inventory = {
    id: string;
    agent: string;
    imei: string;
    model: string;
    color: string;
    appleIdUsername?: string;
    appleIdPassword?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

export type Order = {
    id: string;
    agent: string;
    shopId: string;
    location: string;
    price: number;
    remarks: string;
    status: "Pending" | "Approved" | "Rejected";
}

export type Absence = {
  id: string;
  date: Date;
  agent: string;
  remarks: string;
}

export type Penalty = {
  id: string;
  date: Date;
  agent: string;
  remarks: string;
  amount: number;
}

export type Reward = {
  id: string;
  date: Date;
  agent: string;
  remarks: string;
  status: "Claimed" | "Unclaimed"
}

export type TeamPerformanceData = {
    agentName: string;
    addedToday: number;
    monthlyAdded: number;
    openAccounts: number;
    totalDeposits: number;
    totalWithdrawals: number;
    lastEditedBy: string;
    editor?: string;
};


// --- Context Shape ---

interface DataContextType {
  agents: Agent[];
  clients: Client[];
  dailyAddedClients: DailyAddedClient[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  inventory: Inventory[];
  orders: Order[];
  absences: Absence[];
  penalties: Penalty[];
  rewards: Reward[];
  teamPerformance: { [key: string]: TeamPerformanceData };
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);


// --- Helper Function ---

function createCollectionListener<T>(collectionName: string, setData: (data: T[]) => void, setLoading: (loading: boolean) => void) {
  const q = query(collection(db, collectionName));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const dataList: T[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data();
      const item: any = { id: doc.id, ...docData };
      // Convert Timestamps to Dates for any field
      for (const key in item) {
        if (item[key] instanceof Timestamp) {
          item[key] = item[key].toDate();
        }
      }
      dataList.push(item as T);
    });
    setData(dataList);
    setLoading(false);
  }, (error) => {
    console.error(`Error fetching ${collectionName}:`, error);
    setLoading(false);
  });
  return unsubscribe;
}

// --- Provider Component ---

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dailyAddedClients, setDailyAddedClients] = useState<DailyAddedClient[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<{ [key: string]: TeamPerformanceData }>({});
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        // If no user, clear data and stop loading
        setAgents([]);
        setClients([]);
        setDailyAddedClients([]);
        setDeposits([]);
        setWithdrawals([]);
        setInventory([]);
        setOrders([]);
        setAbsences([]);
        setPenalties([]);
        setRewards([]);
        setTeamPerformance({});
        setLoading(false);
        return;
    }
    
    setLoading(true);
    
    const collections = {
        agents: setAgents,
        clients: setClients,
        dailyAddedClients: setDailyAddedClients,
        deposits: setDeposits,
        withdrawals: setWithdrawals,
        inventory: setInventory,
        orders: setOrders,
        absences: setAbsences,
        penalties: setPenalties,
        rewards: setRewards,
    };

    const unsubscribers = Object.entries(collections).map(([name, setter]) => 
        createCollectionListener(name, setter as any, () => {})
    );

    const perfUnsub = onSnapshot(collection(db, 'teamPerformance'), (snapshot) => {
        const perfDocs: {[key: string]: TeamPerformanceData} = {};
        snapshot.forEach(doc => {
            perfDocs[doc.id] = doc.data() as TeamPerformanceData;
        });
        setTeamPerformance(perfDocs);
    });
    unsubscribers.push(perfUnsub);
    
    const anyLoading = Object.values(collections).length > 0;
    setLoading(anyLoading);
    
    return () => unsubscribers.forEach(unsub => unsub());

  }, [user, authLoading]);

  const value = {
    agents,
    clients,
    dailyAddedClients,
    deposits,
    withdrawals,
    inventory,
    orders,
    absences,
    penalties,
    rewards,
    teamPerformance,
    loading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// --- Custom Hook ---

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
