"use client"

import React, { memo, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface Action<T> {
  label: string
  icon?: React.ReactNode
  onClick: (item: T) => void
  variant?: 'default' | 'destructive'
}

interface OptimizedTableProps<T> {
  data: T[]
  columns: Column<T>[]
  actions?: Action<T>[]
  selectable?: boolean
  selectedItems?: string[]
  onSelectItem?: (id: string, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

const TableRowMemo = memo(<T extends { id: string }>({
  item,
  index,
  columns,
  actions,
  selectable,
  selectedItems,
  onSelectItem
}: {
  item: T
  index: number
  columns: Column<T>[]
  actions?: Action<T>[]
  selectable?: boolean
  selectedItems?: string[]
  onSelectItem?: (id: string, checked: boolean) => void
}) => {
  const isSelected = selectedItems?.includes(item.id) || false

  const handleSelect = useCallback((checked: boolean) => {
    onSelectItem?.(item.id, checked)
  }, [item.id, onSelectItem])

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      {selectable && (
        <TableCell>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={handleSelect}
          />
        </TableCell>
      )}
      {columns.map((column) => (
        <TableCell 
          key={String(column.key)} 
          style={{ width: column.width }}
        >
          {column.render 
            ? column.render(item, index)
            : String(item[column.key as keyof T] || '')
          }
        </TableCell>
      ))}
      {actions && actions.length > 0 && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {actions.map((action, actionIndex) => (
                <React.Fragment key={actionIndex}>
                  {actionIndex > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    onClick={() => action.onClick(item)}
                    className={action.variant === 'destructive' ? 'text-red-600' : ''}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  )
})

TableRowMemo.displayName = 'TableRowMemo'

export function OptimizedTable<T extends { id: string }>({
  data,
  columns,
  actions,
  selectable = false,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  loading = false,
  emptyMessage = "No data available",
  className
}: OptimizedTableProps<T>) {
  const isAllSelected = useMemo(() => 
    data.length > 0 && selectedItems.length === data.length,
    [data.length, selectedItems.length]
  )

  const handleSelectAll = useCallback((checked: boolean) => {
    onSelectAll?.(checked)
  }, [onSelectAll])

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table className={className}>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableHead>}
              {columns.map((column) => (
                <TableHead key={String(column.key)}>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                </TableHead>
              ))}
              {actions && <TableHead><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {selectable && <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>}
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
                {actions && <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded" /></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead>
                <Checkbox 
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead 
                key={String(column.key)}
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead>Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <TableRowMemo
                key={item.id}
                item={item}
                index={index}
                columns={columns}
                actions={actions}
                selectable={selectable}
                selectedItems={selectedItems}
                onSelectItem={onSelectItem}
              />
            ))
          ) : (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} 
                className="h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}