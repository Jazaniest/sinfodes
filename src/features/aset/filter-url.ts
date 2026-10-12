import { filterAsetSchema, type FilterAset } from '@/domain/aset/schema'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_ASET_BAWAAN: FilterAset = filterAsetSchema.parse({})

export const bacaFilterAset = (cari: Record<string, unknown>): FilterAset => bacaFilterUrl(filterAsetSchema, cari)
