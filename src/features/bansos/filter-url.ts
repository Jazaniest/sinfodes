import { filterPenerimaSchema, type FilterPenerima } from '@/domain/bansos/schema'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_PENERIMA_BAWAAN: FilterPenerima = filterPenerimaSchema.parse({})

export const bacaFilterPenerima = (cari: Record<string, unknown>): FilterPenerima => bacaFilterUrl(filterPenerimaSchema, cari)
