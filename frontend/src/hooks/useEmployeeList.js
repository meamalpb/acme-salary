import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { listEmployees } from '../api/employees.js'

export const PER_PAGE_OPTIONS = [10, 25, 50]
const DIRECTIONS = ['asc', 'desc']
// Terminated employees can also be sorted by when they left, newest first by default.
const SORTS = {
  active: ['full_name', 'hire_date', 'salary'],
  terminated: ['full_name', 'hire_date', 'salary', 'terminated_on'],
}
const DEFAULT_SORT = {
  active: { sort: 'full_name', direction: 'asc' },
  terminated: { sort: 'terminated_on', direction: 'desc' },
}

// The URL is the single source of truth for search, filters, sort and page.
// Anything missing or invalid falls back to a default.
export function useEmployeeListParams(status = 'active') {
  const [searchParams, setSearchParams] = useSearchParams()
  const read = (key) => searchParams.get(key) ?? ''
  const page = Number.parseInt(read('page'), 10)
  const perPage = Number.parseInt(read('per_page'), 10)

  const params = {
    q: read('q'),
    country: read('country'),
    department: read('department'),
    // The Terminated list has no Level filter.
    level: status === 'active' ? read('level') : '',
    sort: SORTS[status].includes(read('sort')) ? read('sort') : DEFAULT_SORT[status].sort,
    direction: DIRECTIONS.includes(read('direction')) ? read('direction') : DEFAULT_SORT[status].direction,
    page: page >= 1 ? page : 1,
    perPage: PER_PAGE_OPTIONS.includes(perPage) ? perPage : PER_PAGE_OPTIONS[0],
  }

  // Merges a patch into the URL. Empty values are removed. Any change goes back to
  // page 1 unless the patch sets the page itself.
  function update(patch) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (!('page' in patch)) next.delete('page')
      for (const [key, value] of Object.entries(patch)) {
        const isDefault = (key === 'page' && value === 1) || (key === 'per_page' && value === PER_PAGE_OPTIONS[0])
        if (value === '' || value == null || isDefault) next.delete(key)
        else next.set(key, String(value))
      }
      return next
    })
  }

  function clearFilters() {
    update({ q: '', country: '', department: '', level: '' })
  }

  return { params, update, clearFilters }
}

// Keeps the previous page on screen while the next one loads.
export function useEmployees({ perPage, ...params }, status = 'active') {
  const apiParams = { ...params, per_page: perPage, ...(status === 'terminated' && { status }) }
  return useQuery({
    queryKey: ['employees', 'list', apiParams],
    queryFn: () => listEmployees(apiParams),
    placeholderData: keepPreviousData,
  })
}

// Headcount for a tab, read from the pagination meta of a one-row request.
export function useStatusCount(status) {
  return useQuery({
    queryKey: ['employees', 'count', status],
    queryFn: () => listEmployees({ status, per_page: 1 }),
    select: (response) => response.meta.total_count,
  })
}
