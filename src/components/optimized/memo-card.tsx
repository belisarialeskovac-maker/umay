"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MemoCardProps {
  title: string
  description?: string
  value: string | number
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

export const MemoCard = React.memo<MemoCardProps>(({
  title,
  description,
  value,
  icon,
  className,
  onClick
}) => {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow duration-300 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="text-xs text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
})

MemoCard.displayName = 'MemoCard'