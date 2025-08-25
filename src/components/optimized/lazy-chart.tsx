"use client"

import React, { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'

const Chart = lazy(() => import('recharts').then(module => ({ 
  default: module.BarChart 
})))

const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ 
  default: module.ResponsiveContainer 
})))

interface LazyChartProps {
  data: any[]
  children: React.ReactNode
  height?: number
}

const ChartFallback = () => (
  <div className="flex items-center justify-center h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
)

export const LazyChart = React.memo<LazyChartProps>(({ data, children, height = 400 }) => {
  return (
    <Suspense fallback={<ChartFallback />}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data}>
            {children}
          </Chart>
        </ResponsiveContainer>
      </div>
    </Suspense>
  )
})

LazyChart.displayName = 'LazyChart'