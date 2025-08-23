
"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { AgentStats } from "../page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"


type AgentStatisticsProps = {
  agentStats: AgentStats
}

export default function AgentStatistics({ agentStats }: AgentStatisticsProps) {
  const data = Object.entries(agentStats).map(([name, count]) => ({
    name,
    devices: count,
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-center">
        <div>
            <h3 className="text-lg font-semibold">No Data Available</h3>
            <p className="text-sm text-muted-foreground">Add devices to see agent statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Device Distribution by Agent</CardTitle>
            <CardDescription>Number of devices assigned to each agent.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))'
                    }}
                />
                <Legend />
                <Bar dataKey="devices" fill="hsl(var(--primary))" />
            </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>

  )
}
