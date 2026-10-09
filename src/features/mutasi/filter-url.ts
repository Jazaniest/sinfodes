import { filterMutasiSchema, type FilterMutasi } from '@/domain/mutasi/buku'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_MUTASI_BAWAAN: FilterMutasi = filterMutasiSchema.parse({})

export const bacaFilterMutasi = (cari: Record<string, unknown>): FilterMutasi => bacaFilterUrl(filterMutasiSchema, cari)
