
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowDownToLine, ArrowUpFromLine, Loader2, Trophy, Store, UserPlus, Crown, Award } from "lucide-react";
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
        if (isAllTime) {
            // A very large interval to effectively capture all time
            return { start: new Date(0), end: new Date(8640000000000000) };
        }
        if (selectedMonth === 'all' && typeof selectedYear === 'number') {
            return { start: new Date(selectedYear, 0, 1), end: new Date(selectedYear, 11, 31, 23, 59, 59) };
        }
        const year = typeof selectedYear === 'number' ? selectedYear : getYear(new Date());
        const month = typeof selectedMonth === 'number' ? selectedMonth : getMonth(new Date());
        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));
        return { start: startDate, end: endDate };
    };

    const interval = getInterval();
    
    const filterByInterval = (items: any[], dateField: string) => {
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
    if (selectedYear === 'all') return 'All Time';
    
    const yearLabel = selectedYear;
    const monthLabel = selectedMonth === 'all' 
        ? 'the entire year of' 
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

 const renderLeaderboard = (title: string, data: LeaderboardEntry[], isCurrency = false, icon: React.ReactNode, iconBgClass: string) => {
    const getRankComponent = (rank: number) => {
        const rankClasses = "h-6 w-6";
        if (rank === 0) return <div className={cn("flex items-center justify-center font-bold text-lg rounded-full h-8 w-8", "bg-yellow-400/20 text-yellow-500")}>1</div>;
        if (rank === 1) return <div className={cn("flex items-center justify-center font-bold text-lg rounded-full h-8 w-8", "bg-gray-400/20 text-gray-500")}>2</div>;
        if (rank === 2) return <div className={cn("flex items-center justify-center font-bold text-lg rounded-full h-8 w-8", "bg-yellow-600/20 text-yellow-700")}>3</div>;
        return <div className="text-muted-foreground w-8 text-center">{rank + 1}</div>;
    };
    
    return (
        <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-full", iconBgClass)}>
                    {icon}
                </div>
                <CardTitle>{title}</CardTitle>
            </div>
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
                    {data.length > 0 ? data.map((entry, index) => (
                    <TableRow key={index} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="font-bold">{getRankComponent(index)}</TableCell>
                        <TableCell className="font-medium">{entry.agentName}</TableCell>
                        <TableCell className="text-right font-semibold">{isCurrency ? `$${entry.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : entry.value}</TableCell>
                    </TableRow>
                    )) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No data for this period.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
        </Card>
  )};

  const renderTopPerformerCard = (title: string, data: LeaderboardEntry[], isCurrency = false, icon: React.ReactNode) => {
    const topPerformer = data[0];
    if (!topPerformer || topPerformer.value === 0) {
        return (
             <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">{icon} {title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-4">No top performer this period.</p>
                </CardContent>
            </Card>
        );
    }
    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-background hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 p-2 bg-primary/80 text-primary-foreground text-xs font-bold rounded-bl-lg">TOP PERFORMER</div>
            <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">{icon} {title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary">{topPerformer.agentName}</p>
                <p className="text-4xl font-extrabold text-foreground mt-2">
                    {isCurrency ? `$${topPerformer.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : topPerformer.value}
                </p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="w-full h-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Performance Arena</h1>
          <p className="text-muted-foreground mt-1">An overview of agent performance for <span className="font-semibold text-primary">{getFilterLabel()}</span>.</p>
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
              <SelectItem value="all">All Time</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {renderTopPerformerCard("Top Deposits", topDeposits, true, <Trophy className="text-yellow-500" />)}
        {renderTopPerformerCard("Top Shops Opened", topShops, false, <Store className="text-blue-500" />)}
        {renderTopPerformerCard("Top Clients Added", topClientsAdded, false, <UserPlus className="text-green-500" />)}
      </div>

      <div>
        <h2 className="text-3xl font-bold text-foreground mb-4">Leaderboards</h2>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {renderLeaderboard("Top 10 Agent Deposits", topDeposits, true, <Trophy className="text-yellow-500" />, "bg-yellow-500/10")}
          {renderLeaderboard("Top 10 Shops Opened", topShops, false, <Store className="text-blue-500" />, "bg-blue-500/10")}
          {renderLeaderboard("Top 10 Clients Added", topClientsAdded, false, <UserPlus className="text-green-500" />, "bg-green-500/10")}
        </div>
      </div>

    </div>
  );
}

export default withAuth(Home);
