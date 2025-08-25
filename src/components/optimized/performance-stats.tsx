"use client"

import React, { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PerformanceStatsProps {
  stats: {
    daily: number
    monthly: number
    total: number
    deposits: number
  }
  loading?: boolean
}

export const PerformanceStats = memo<PerformanceStatsProps>(({ stats, loading = false }) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Daily Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.daily}</div>
          <CardDescription>Added today</CardDescription>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.monthly}</div>
          <CardDescription>Added this month</CardDescription>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
          <CardDescription>All-time count</CardDescription>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${stats.deposits.toFixed(2)}</div>
          <CardDescription>This month</CardDescription>
        </CardContent>
      </Card>
    </div>
  )
})

PerformanceStats.displayName = 'PerformanceStats'