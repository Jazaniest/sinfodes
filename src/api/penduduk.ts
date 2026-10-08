import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import { pendudukSchema } from '@/domain/penduduk/schema'
import { panggilApi } from './client'

const daftarPendudukSchema = daftarSchema(pendudukSchema)

export const kunciPenduduk = {
  semua: ['penduduk'] as const,
  daftar: (filter: Partial<FilterPenduduk>) => ['penduduk', 'daftar', filter] as const,
  detail: (id: string) => ['penduduk', 'detail', id] as const,
}

export function daftarPenduduk(filter: Partial<FilterPenduduk>, signal?: AbortSignal) {
  return panggilApi('GET', '/penduduk', { skema: daftarPendudukSchema, query: filter, signal })
}

export function ambilPenduduk(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/penduduk/${encodeURIComponent(id)}`, { skema: pendudukSchema, signal })
}

export const opsiDaftarPenduduk = (filter: Partial<FilterPenduduk>) =>
  queryOptions({ queryKey: kunciPenduduk.daftar(filter), queryFn: ({ signal }) => daftarPenduduk(filter, signal) })

export const opsiPenduduk = (id: string) =>
  queryOptions({ queryKey: kunciPenduduk.detail(id), queryFn: ({ signal }) => ambilPenduduk(id, signal) })
