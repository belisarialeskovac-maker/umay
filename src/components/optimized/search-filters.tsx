"use client"

import React, { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface Filter {
  key: string
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

interface SearchFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: Filter[]
  className?: string
}

export const SearchFilters = memo<SearchFiltersProps>(({
  searchValue,
  onSearchChange,
  filters,
  className
}) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 mb-4 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search..." 
          className="pl-10" 
          value={searchValue} 
          onChange={(e) => onSearchChange(e.target.value)} 
        />
      </div>
      {filters.map((filter) => (
        <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
})

SearchFilters.displayName = 'SearchFilters'