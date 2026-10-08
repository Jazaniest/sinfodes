import { filterKeluargaSchema, type FilterKeluarga } from '@/domain/keluarga/schema'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_KELUARGA_BAWAAN: FilterKeluarga = filterKeluargaSchema.parse({})

export const bacaFilterKeluarga = (cari: Record<string, unknown>): FilterKeluarga => bacaFilterUrl(filterKeluargaSchema, cari)
