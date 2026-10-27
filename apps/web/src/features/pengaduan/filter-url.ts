import { filterPengaduanSchema, type FilterPengaduan } from '@/domain/pengaduan/schema'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_PENGADUAN_BAWAAN: FilterPengaduan = filterPengaduanSchema.parse({})

export const bacaFilterPengaduan = (cari: Record<string, unknown>): FilterPengaduan => bacaFilterUrl(filterPengaduanSchema, cari)

/** Alamat kotak masuk dengan filter tertentu; nilai bawaan tidak ditulis supaya URL tetap pendek. */
export function hrefPengaduan(filter: Partial<FilterPengaduan>): string {
  const cari = new URLSearchParams()
  for (const [kunci, nilai] of Object.entries(filter)) {
    if (nilai === undefined || nilai === FILTER_PENGADUAN_BAWAAN[kunci as keyof FilterPengaduan]) continue
    cari.set(kunci, String(nilai))
  }
  const teks = cari.toString()
  return teks ? `/admin/pengaduan?${teks}` : '/admin/pengaduan'
}
