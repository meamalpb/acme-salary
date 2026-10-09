import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEmployee, updateEmployee } from '../api/employees.js'

// Creates a new employee, or updates the given one. Refreshes the list and the tab counts after.
export function useSaveEmployee(employee) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields) => (employee ? updateEmployee(employee.id, fields) : createEmployee(fields)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}
