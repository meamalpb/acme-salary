import { useQuery } from '@tanstack/react-query'
import { getMeta } from '../api/meta.js'

// The fixed lists never change while the app is open, so fetch them once.
export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: getMeta, staleTime: Infinity })
}
