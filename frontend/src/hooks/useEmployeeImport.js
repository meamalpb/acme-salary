import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createEmployeeImport, getEmployeeImport } from '../api/employeeImports.js'

const POLL_INTERVAL_MS = 1000

export function isFinished(employeeImport) {
  return employeeImport?.status === 'succeeded' || employeeImport?.status === 'failed'
}

export function useUploadEmployeeImport() {
  return useMutation({ mutationFn: (file) => createEmployeeImport(file) })
}

// Polls the import until it has finished. Refreshes the lists, tab counts and insights once it succeeds.
export function useEmployeeImport(id) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['employee-imports', id],
    queryFn: () => getEmployeeImport(id),
    enabled: id !== undefined,
    refetchInterval: ({ state }) => (isFinished(state.data) ? false : POLL_INTERVAL_MS),
  })

  const succeeded = query.data?.status === 'succeeded'
  useEffect(() => {
    if (!succeeded) return
    queryClient.invalidateQueries({ queryKey: ['employees'] })
    queryClient.invalidateQueries({ queryKey: ['insights'] })
  }, [succeeded, queryClient])

  return query
}
