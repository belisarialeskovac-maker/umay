
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react"

import DepositTab from "./deposit-tab"
import WithdrawalTab from "./withdrawal-tab"
import withAuth from "@/components/with-auth"

function TransactionsPage() {

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client deposits and withdrawals.
          </p>
        </div>
      </div>
       <Tabs defaultValue="deposit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">
              <ArrowDownToLine className="mr-2 h-4 w-4"/>Deposit
          </TabsTrigger>
          <TabsTrigger value="withdrawal">
              <ArrowUpFromLine className="mr-2 h-4 w-4"/>Withdrawal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="deposit" className="mt-4">
          <DepositTab />
        </TabsContent>
        <TabsContent value="withdrawal" className="mt-4">
          <WithdrawalTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}


export default withAuth(TransactionsPage);

    