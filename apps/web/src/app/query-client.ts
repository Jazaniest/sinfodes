import { QueryClient } from '@tanstack/react-query'
import { GalatApi } from '@/api/galat'

/** Coba lagi sekali hanya untuk galat server atau jaringan putus. */
export function bolehCobaLagi(percobaan: number, galat: unknown): boolean {
  return galat instanceof GalatApi && (galat.status === 0 || galat.status >= 500) && percobaan < 1
}

export function buatQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: bolehCobaLagi } },
  })
}
