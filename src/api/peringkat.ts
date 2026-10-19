import { queryOptions } from '@tanstack/react-query'
import { peringkatDesaSchema, type FilterPeringkat } from '@/domain/indeks/peringkat-desa'
import { panggilApi } from './client'

/** Halaman Peringkat panel desa: tanpa parameter berarti bulan terakhir tutup (SPEC-V0.2 §9.3). */
export const ambilPeringkat = (c: FilterPeringkat, signal?: AbortSignal) => panggilApi('GET', '/peringkat', { skema: peringkatDesaSchema, query: { ...c }, signal })
export const opsiPeringkat = (c: FilterPeringkat = {}) =>
  queryOptions({ queryKey: ['peringkat', c.musim ?? null, c.periode ?? null] as const, queryFn: ({ signal }) => ambilPeringkat(c, signal) })
