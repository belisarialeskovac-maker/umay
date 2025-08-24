
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format, getMonth, getYear, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";

type Client = {
  kycCompletedDate: Date;
};

type Transaction = {
  date: Date;
  amount: number;
};

export default function Home() {
  const [stats, setStats] = useState({
    clients: 0,
    deposits: 0,
    withdrawals: 0,
  });
  
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allDeposits, setAllDeposits] = useState<Transaction[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<Transaction[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  
  const availableYears = [getYear(new Date()), getYear(new Date()) - 1, getYear(new Date()) - 2];
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  useEffect(() => {
    const unsubscribeClients = onSnapshot(query(collection(db, "clients")), (snapshot) => {
        setAllClients(snapshot.docs.map(doc => ({ ...doc.data(), kycCompletedDate: (doc.data().kycCompletedDate as Timestamp).toDate() } as Client)));
    });

    const unsubscribeDeposits = onSnapshot(query(collection(db, "deposits")), (snapshot) => {
        setAllDeposits(snapshot.docs.map(doc => ({ ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Transaction)));
    });
    
    const unsubscribeWithdrawals = onSnapshot(query(collection(db, "withdrawals")), (snapshot) => {
        setAllWithdrawals(snapshot.docs.map(doc => ({ ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Transaction)));
    });

    return () => {
        unsubscribeClients();
        unsubscribeDeposits();
        unsubscribeWithdrawals();
    }
  }, []);

  useEffect(() => {
    const calculateStats = () => {
      const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
      const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
      const interval = { start: startDate, end: endDate };

      const filteredClients = allClients.filter(c => isWithinInterval(c.kycCompletedDate, interval)).length;
      const filteredDeposits = allDeposits
        .filter(d => isWithinInterval(d.date, interval))
        .reduce((sum, d) => sum + d.amount, 0);
      const filteredWithdrawals = allWithdrawals
        .filter(w => isWithinInterval(w.date, interval))
        .reduce((sum, w) => sum + w.amount, 0);
        
      setStats({
        clients: filteredClients,
        deposits: filteredDeposits,
        withdrawals: filteredWithdrawals,
      });
    };
    
    calculateStats();
  }, [selectedMonth, selectedYear, allClients, allDeposits, allWithdrawals]);


  return (
    <div className="w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">An overview of your workspace for {months[selectedMonth].label} {selectedYear}.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground">New clients this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.deposits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total deposits this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.withdrawals.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total withdrawals this month</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
