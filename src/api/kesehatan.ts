import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { barisBalitaSchema, ringkasPosyanduSchema, type FilterBalita } from '@/domain/kesehatan/schema'
import { panggilApi } from './client'

const daftarPosyanduSchema = daftarSchema(ringkasPosyanduSchema)
const daftarBalitaSchema = daftarSchema(barisBalitaSchema)

export const kunciKesehatan = {
  semua: ['kesehatan'] as const,
  posyandu: ['kesehatan', 'posyandu'] as const,
  balita: (f: Partial<FilterBalita>) => ['kesehatan', 'balita', f] as const,
}

export function daftarPosyandu(signal?: AbortSignal) {
  return panggilApi('GET', '/kesehatan/posyandu', { skema: daftarPosyanduSchema, signal })
}

export const opsiPosyandu = () => queryOptions({ queryKey: kunciKesehatan.posyandu, queryFn: ({ signal }) => daftarPosyandu(signal) })

export function daftarBalita(filter: Partial<FilterBalita>, signal?: AbortSignal) {
  return panggilApi('GET', '/kesehatan/balita', { skema: daftarBalitaSchema, query: filter, signal })
}

export const opsiBalita = (filter: Partial<FilterBalita>) =>
  queryOptions({ queryKey: kunciKesehatan.balita(filter), queryFn: ({ signal }) => daftarBalita(filter, signal) })
