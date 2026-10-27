import {
  filterSuratKeluarSchema, filterSuratMasukSchema, type FilterSuratKeluar, type FilterSuratMasuk,
} from '@/domain/surat/arsip'
import { bacaFilterUrl } from '../../admin/baca-filter'

export const FILTER_SURAT_KELUAR_BAWAAN: FilterSuratKeluar = filterSuratKeluarSchema.parse({})
export const bacaFilterSuratKeluar = (cari: Record<string, unknown>): FilterSuratKeluar => bacaFilterUrl(filterSuratKeluarSchema, cari)

export const FILTER_SURAT_MASUK_BAWAAN: FilterSuratMasuk = filterSuratMasukSchema.parse({})
export const bacaFilterSuratMasuk = (cari: Record<string, unknown>): FilterSuratMasuk => bacaFilterUrl(filterSuratMasukSchema, cari)
