import { useMemo, useState, useCallback } from 'react'

interface UseVirtualPaginationProps<T> {
  data: T[]
  pageSize: number
  searchTerm?: string
  filters?: Record<string, any>
  searchFields?: (keyof T)[]
}

export function useVirtualPagination<T>({
  data,
  pageSize,
  searchTerm = '',
  filters = {},
  searchFields = []
}: UseVirtualPaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)

  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (searchTerm && searchFields.length > 0) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field]
          return String(value).toLowerCase().includes(term)
        })
      )
    }

    // Apply other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          const itemValue = item[key as keyof T]
          return itemValue === value
        })
      }
    })

    return filtered
  }, [data, searchTerm, filters, searchFields])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredData.slice(startIndex, startIndex + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    data: paginatedData,
    totalItems: filteredData.length,
    currentPage,
    totalPages,
    goToPage,
    resetPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  }
}