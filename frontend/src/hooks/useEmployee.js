import { useQuery } from '@tanstack/react-query'
import { getEmployee } from '../api/employees.js'

export function useEmployee(id) {
  return useQuery({ queryKey: ['employees', 'one', id], queryFn: () => getEmployee(id) })
}
