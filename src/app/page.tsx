
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowDownToLine, ArrowUpFromLine, Loader2, Trophy, Store, UserPlus, Medal } from "lucide-react";
import { format, getMonth, getYear, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import withAuth from '@/components/with-auth';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import { cn } from '@/lib/utils';
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

  const [selectedMonth, setSelectedMonth] = useState<string | number>(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState<string | number>(getYear(new Date()));
  
  const availableYears = useMemo(() => [getYear(new Date()), getYear(new Date()) - 1, getYear(new Date()) - 2], []);
  
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  })), []);

  const calculateStats = useCallback(() => {
    const isAllTime = selectedYear === 'all';

    const getInterval = () => {
        if (isAllTime || selectedMonth === 'all') {
            return { start: new Date(0), end: new Date() };
        }
        const year = typeof selectedYear === 'number' ? selectedYear : getYear(new Date());
        const month = typeof selectedMonth === 'number' ? selectedMonth : getMonth(new Date());
        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));
        return { start: startDate, end: endDate };
    };

    const interval = getInterval();

    const filterByInterval = (items: any[], dateField: string) => {
        if (isAllTime) return items;
        if (selectedMonth === 'all' && typeof selectedYear === 'number') {
            return items.filter(item => getYear(item[dateField]) === selectedYear);
        }
        return items.filter(item => isWithinInterval(item[dateField], interval));
    };

    // Dashboard Stats
    const filteredClients = filterByInterval(allClients, 'kycCompletedDate');
    const filteredDeposits = filterByInterval(allDeposits, 'date');
    const filteredWithdrawals = filterByInterval(allWithdrawals, 'date');
    
    setStats({
      clients: filteredClients.length,
      deposits: filteredDeposits.reduce((sum, d) => sum + d.amount, 0),
      withdrawals: filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0),
    });

    const displayAgents = agents.filter(agent => agent.role !== 'Superadmin');
    
    // Leaderboards
    const depositsByAgent = displayAgents.map(agent => {
        const total = filterByInterval(allDeposits, 'date')
            .filter(d => d.agent === agent.name)
            .reduce((sum, d) => sum + d.amount, 0);
        return { agentName: agent.name, value: total };
    }).sort((a,b) => b.value - a.value).slice(0,10);
    setTopDeposits(depositsByAgent);

    const shopsByAgent = displayAgents.map(agent => {
        const count = filterByInterval(allClients, 'kycCompletedDate').filter(c => c.agent === agent.name).length;
        return { agentName: agent.name, value: count };
    }).sort((a,b) => b.value - a.value).slice(0,10);
    setTopShops(shopsByAgent);
    
    const clientsAddedByAgent = displayAgents.map(agent => {
        const count = filterByInterval(allDailyAddedClients, 'date').filter(c => c.assignedAgent === agent.name).length;
        return { agentName: agent.name, value: count };
    }).sort((a,b) => b.value - a.value).slice(0,10);
    setTopClientsAdded(clientsAddedByAgent);

  }, [selectedMonth, selectedYear, allClients, allDeposits, allWithdrawals, allDailyAddedClients, agents]);
  
  useEffect(() => {
    if (!dataLoading) {
      calculateStats();
    }
  }, [dataLoading, calculateStats]);

  const handleYearChange = (value: string) => {
    const yearValue = value === 'all' ? 'all' : Number(value);
    setSelectedYear(yearValue);
    if (yearValue === 'all') {
        setSelectedMonth('all');
    }
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value === 'all' ? 'all' : Number(value));
  };
  
  const getFilterLabel = () => {
    if (selectedYear === 'all') return 'All time';
    
    const yearLabel = selectedYear;
    const monthLabel = selectedMonth === 'all' 
        ? 'the entire year' 
        : months.find(m => m.value === selectedMonth)?.label;
        
    return `${monthLabel} ${yearLabel}`;
  }


  if (dataLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const renderLeaderboard = (title: string, data: LeaderboardEntry[], isCurrency = false, icon: React.ReactNode) => {
      const getMedalColor = (rank: number) => {
        if (rank === 0) return "text-yellow-500"; // Gold
        if (rank === 1) return "text-gray-400";  // Silver
        if (rank === 2) return "text-yellow-700"; // Bronze
        return "text-muted-foreground";
    };
    
    return (
        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((entry, index) => (
                <TableRow key={index} className={cn(index < 3 && "bg-accent/50")}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           {index < 3 ? <Medal className={cn("h-5 w-5", getMedalColor(index))} /> : <span className="w-5 text-center">{index + 1}</span>}
                        </div>
                    </TableCell>
                    <TableCell>{entry.agentName}</TableCell>
                    <TableCell className="text-right">{isCurrency ? `$${entry.value.toFixed(2)}` : entry.value}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
  )};

  return (
    <div className="w-full h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">An overview of your workspace for {getFilterLabel()}.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={handleMonthChange} disabled={selectedYear === 'all'}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
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
            <p className="text-xs text-muted-foreground">New shops for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.deposits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total deposits for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.withdrawals.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total withdrawals for selected period</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Performance Leaderboards</h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {renderLeaderboard("Top 10 Agent Deposits", topDeposits, true, <Trophy className="text-yellow-500" />)}
          {renderLeaderboard("Top 10 Shop Open", topShops, false, <Store className="text-blue-500" />)}
          {renderLeaderboard("Top 10 Client Added", topClientsAdded, false, <UserPlus className="text-green-500" />)}
        </div>
      </div>

    </div>
  );
}

export default withAuth(Home);
