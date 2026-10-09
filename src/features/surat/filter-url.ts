import { filterPermohonanSchema, type FilterPermohonan } from '@/domain/surat/permohonan'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_PERMOHONAN_BAWAAN: FilterPermohonan = filterPermohonanSchema.parse({})

export const bacaFilterPermohonan = (cari: Record<string, unknown>): FilterPermohonan => bacaFilterUrl(filterPermohonanSchema, cari)

/** Alamat daftar permohonan dengan filter tertentu; nilai bawaan tidak ditulis supaya URL tetap pendek. */
export function hrefPermohonan(filter: Partial<FilterPermohonan>): string {
  const cari = new URLSearchParams()
  for (const [kunci, nilai] of Object.entries(filter)) {
    if (nilai === undefined || nilai === FILTER_PERMOHONAN_BAWAAN[kunci as keyof FilterPermohonan]) continue
    cari.set(kunci, String(nilai))
  }
  const teks = cari.toString()
  return teks ? `/admin/surat?${teks}` : '/admin/surat'
}
