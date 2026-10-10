import { useQuery } from '@tanstack/react-query'
import { getCountryInsights } from '../api/insights.js'

export function useCountryInsights() {
  return useQuery({
    queryKey: ['insights', 'countries'],
    queryFn: getCountryInsights,
    select: (response) => response.data,
  })
}
