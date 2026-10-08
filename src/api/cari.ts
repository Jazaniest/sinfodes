import { queryOptions } from '@tanstack/react-query'
import { hasilCariSchema } from '@/domain/cari/schema'
import { panggilApi } from './client'

/** Pencarian cepat lewat POST, karena kata bisa berisi NIK (SPEC §3.4, §5.4). */
export const cari = (kata: string, signal?: AbortSignal) =>
  panggilApi('POST', '/cari', { skema: hasilCariSchema, body: { kata }, signal })

export const opsiCari = (kata: string) =>
  queryOptions({ queryKey: ['cari', kata] as const, queryFn: ({ signal }) => cari(kata, signal), staleTime: 30_000 })
