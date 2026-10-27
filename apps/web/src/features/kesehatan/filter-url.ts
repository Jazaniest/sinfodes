import { filterBalitaSchema, type FilterBalita } from '@/domain/kesehatan/schema'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_BALITA_BAWAAN: FilterBalita = filterBalitaSchema.parse({})

export const bacaFilterBalita = (cari: Record<string, unknown>): FilterBalita => bacaFilterUrl(filterBalitaSchema, cari)
