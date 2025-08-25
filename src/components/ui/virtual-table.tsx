"use client"

import React, { useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface VirtualTableProps<T> {
  data: T[]
  columns: {
    key: string
    header: string
    render: (item: T, index: number) => React.ReactNode
    width?: number
  }[]
  height: number
  itemHeight?: number
  className?: string
}

export function VirtualTable<T extends { id: string }>({
  data,
  columns,
  height,
  itemHeight = 60,
  className
}: VirtualTableProps<T>) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index]
    
    return (
      <div style={style}>
        <TableRow className="border-b">
          {columns.map((column) => (
            <TableCell 
              key={column.key} 
              style={{ width: column.width || 'auto' }}
              className="p-4"
            >
              {column.render(item, index)}
            </TableCell>
          ))}
        </TableRow>
      </div>
    )
  }, [data, columns])

  const memoizedColumns = useMemo(() => columns, [columns])

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {memoizedColumns.map((column) => (
              <TableHead 
                key={column.key}
                style={{ width: column.width || 'auto' }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  )
}