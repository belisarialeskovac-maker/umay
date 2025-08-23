"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const absences = [
  { date: "2024-07-28", agent: "John Doe", remarks: "Sick leave" },
  { date: "2024-07-27", agent: "Jane Smith", remarks: "Personal day" },
]

const penalties = [
  { date: "2024-07-28", agent: "John Doe", remarks: "Late for shift", amount: "$25" },
  { date: "2024-07-26", agent: "Peter Jones", remarks: "Missed deadline", amount: "$50" },
]

const rewards = [
  { date: "2024-07-25", agent: "Jane Smith", remarks: "Exceeded sales target", status: "Claimed" },
  { date: "2024-07-24", agent: "John Doe", remarks: "Top performer of the week", status: "Unclaimed" },
]

export default function TeamPerformancePage() {
  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track your team's absences, penalties, and rewards.
          </p>
        </div>
      </div>
      <Tabs defaultValue="absences">
        <TabsList>
          <TabsTrigger value="absences">Absences</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="absences">
          {absences.length > 0 ? (
            <div className="rounded-lg border bg-card mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  No Absences Recorded
                </h2>
                <p className="text-muted-foreground mt-2">
                  Absence data will appear here.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="penalties">
        {penalties.length > 0 ? (
            <div className="rounded-lg border bg-card mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penalties.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  No Penalties Recorded
                </h2>
                <p className="text-muted-foreground mt-2">
                  Penalty data will appear here.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="rewards">
        {rewards.length > 0 ? (
            <div className="rounded-lg border bg-card mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.agent}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Claimed' ? 'secondary' : 'default'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh] mt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  No Rewards Recorded
                </h2>
                <p className="text-muted-foreground mt-2">
                  Reward data will appear here.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
