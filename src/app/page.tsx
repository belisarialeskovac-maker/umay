
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format, getMonth, getYear, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';

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
    // Load data from localStorage
    const storedClients = localStorage.getItem("clients");
    if (storedClients) {
        setAllClients(JSON.parse(storedClients).map((c: any) => ({ ...c, kycCompletedDate: new Date(c.kycCompletedDate) })));
    }

    const storedDeposits = localStorage.getItem("deposits");
    if (storedDeposits) {
        setAllDeposits(JSON.parse(storedDeposits).map((d: any) => ({ ...d, date: new Date(d.date) })));
    }
    
    const storedWithdrawals = localStorage.getItem("withdrawals");
    if (storedWithdrawals) {
        setAllWithdrawals(JSON.parse(storedWithdrawals).map((w: any) => ({ ...w, date: new Date(w.date) })));
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

       <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[45vh] p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to your Dashboard
          </h2>
          <p className="text-muted-foreground mt-2">
            Select a page from the sidebar to view more details.
          </p>
        </div>
      </div>
    </div>
  );
}
