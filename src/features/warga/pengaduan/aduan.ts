import { KATEGORI_PENGADUAN, type KategoriPengaduan } from '@/domain/pengaduan/schema'

/** Yang disimpan sebagai draf pengaduan; foto tidak ikut (fokus review 4). */
export type DrafAduan = { kategori: KategoriPengaduan | null; cerita: string; lokasi: string }
export const DRAF_ADUAN_KOSONG: DrafAduan = { kategori: null, cerita: '', lokasi: '' }

/** Draf per warga: warga lain di HP yang sama tidak melihatnya. */
export const kunciDrafAduan = (pendudukId: string): string => `warga.aduan.${pendudukId}`

export function drafAduanSah(x: unknown): x is DrafAduan {
  if (typeof x !== 'object' || x === null) return false
  const d = x as Record<string, unknown>
  return (
    (d.kategori === null || KATEGORI_PENGADUAN.some((k) => k === d.kategori)) &&
    typeof d.cerita === 'string' &&
    typeof d.lokasi === 'string'
  )
}
