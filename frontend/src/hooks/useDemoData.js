import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAllEmployees, seedDemoData } from '../api/demo.js'

// Both demo actions change every list, count and insight.
function useRefreshingMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['insights'] }),
      ]),
  })
}

export const useSeedDemoData = () => useRefreshingMutation(seedDemoData)
export const useDeleteAllEmployees = () => useRefreshingMutation(deleteAllEmployees)
