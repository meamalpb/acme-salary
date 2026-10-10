import { useMutation, useQueryClient } from '@tanstack/react-query'
import { terminateEmployee } from '../api/employees.js'

// Refreshes both lists, the tab counts and insights after an employee is terminated.
export function useTerminateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => terminateEmployee(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['insights'] }),
      ]),
  })
}
