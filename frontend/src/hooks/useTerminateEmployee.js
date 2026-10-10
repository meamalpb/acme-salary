import { useMutation, useQueryClient } from '@tanstack/react-query'
import { terminateEmployee } from '../api/employees.js'

// Refreshes both lists and the tab counts after an employee is terminated.
export function useTerminateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => terminateEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}
