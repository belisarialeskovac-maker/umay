
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowDownToLine, ArrowUpFromLine, Loader2, Trophy } from "lucide-react";
import { format, getMonth, getYear, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import withAuth from '@/components/with-auth';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import type { Agent } from '@/context/data-context';

type LeaderboardEntry = {
    agentName: string;
    value: number;
}

function Home() {
  const { loading: authLoading } = useAuth();
  const { 
    agents, 
    clients: allClients, 
    deposits: allDeposits, 
    withdrawals: allWithdrawals, 
    dailyAddedClients: allDailyAddedClients,
    loading: dataLoading 
  } = useData();
  
  const [stats, setStats] = useState({
    clients: 0,
    deposits: 0,
    withdrawals: 0,
  });

  const [topDeposits, setTopDeposits] = useState<LeaderboardEntry[]>([]);
  const [topShops, setTopShops] = useState<LeaderboardEntry[]>([]);
  const [topClientsAdded, setTopClientsAdded] = useState<LeaderboardEntry[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  
  const availableYears = useMemo(() => [getYear(new Date()), getYear(new Date()) - 1, getYear(new Date()) - 2], []);
  
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  })), []);

  const calculateStats = useCallback(() => {
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
    const interval = { start: startDate, end: endDate };

    // Dashboard Stats
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

    const displayAgents = agents.filter(agent => agent.role !== 'Superadmin');
    
    // Leaderboards
    const depositsByAgent = displayAgents.map(agent => {
        const total = allDeposits
            .filter(d => d.agent === agent.name && isWithinInterval(d.date, interval))
            .reduce((sum, d) => sum + d.amount, 0);
        return { agentName: agent.name, value: total };
    }).sort((a,b) => b.value - a.value).slice(0,10);
    setTopDeposits(depositsByAgent);

    const shopsByAgent = displayAgents.map(agent => {
        const count = allClients.filter(c => c.agent === agent.name && isWithinInterval(c.kycCompletedDate, interval)).length;
        return { agentName: agent.name, value: count };
    }).sort((a,b) => b.value - a.value).slice(0,10);
    setTopShops(shopsByAgent);
    
    const clientsAddedByAgent = displayAgents.map(agent => {
        const count = allDailyAddedClients.filter(c => c.assignedAgent === agent.name && isWithinInterval(c.date, interval)).length;
        return { agentName: agent.name, value: count };
    }).sort((a,b) => b.value - a.value).slice(0,10);
    setTopClientsAdded(clientsAddedByAgent);

  }, [selectedMonth, selectedYear, allClients, allDeposits, allWithdrawals, allDailyAddedClients, agents]);
  
  useEffect(() => {
    if (!dataLoading) {
      calculateStats();
    }
  }, [dataLoading, calculateStats]);

  if (dataLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const renderLeaderboard = (title: string, data: LeaderboardEntry[], isCurrency = false) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500"/> {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{entry.agentName}</TableCell>
                <TableCell>{isCurrency ? `$${entry.value.toFixed(2)}` : entry.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
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
            <CardTitle className="text-sm font-medium">New Shops</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground">New shops this month</p>
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

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Performance Leaderboards</h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {renderLeaderboard("Top 10 Agent Deposits", topDeposits, true)}
          {renderLeaderboard("Top 10 Shop Open", topShops)}
          {renderLeaderboard("Top 10 Client Added", topClientsAdded)}
        </div>
      </div>

    </div>
  );
}

export default withAuth(Home);
