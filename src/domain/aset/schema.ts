import { z } from 'zod'

/** SPEC §8. */
export const KATEGORI_ASET = ['Tanah', 'Bangunan', 'Kendaraan', 'Peralatan'] as const
export type KategoriAset = (typeof KATEGORI_ASET)[number]

export const KONDISI_ASET = ['baik', 'rusak-ringan', 'rusak-berat'] as const
export type KondisiAset = (typeof KONDISI_ASET)[number]
export const LABEL_KONDISI: Readonly<Record<KondisiAset, string>> = { baik: 'Baik', 'rusak-ringan': 'Rusak ringan', 'rusak-berat': 'Rusak berat' }

export const ASAL_ASET = ['Pembelian', 'Hibah', 'Bantuan pemerintah', 'Swadaya'] as const

/** Satu butir inventaris desa. Kode: golongan.bidang.nomor urut, mis. "02.06.001". */
export const asetSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  kode: z.string().regex(/^\d{2}\.\d{2}\.\d{3}$/),
  nama: z.string().min(1),
  kategori: z.enum(KATEGORI_ASET),
  tahunPerolehan: z.number().int().min(1950),
  asal: z.enum(ASAL_ASET),
  nilaiPerolehan: z.number().int().min(0),
  kondisi: z.enum(KONDISI_ASET),
  /** Mis. luas tanah dan letaknya, atau jumlah unit. */
  keterangan: z.string().nullable(),
})
export type Aset = z.infer<typeof asetSchema>

/** GET /aset. */
export const filterAsetSchema = z.object({ kategori: z.enum(KATEGORI_ASET).optional() })
export type FilterAset = z.infer<typeof filterAsetSchema>

/** Jumlah butir dan nilai perolehan dari baris yang tampil. */
export function ringkasAset(daftar: readonly Aset[]): { jumlah: number; nilai: number } {
  return { jumlah: daftar.length, nilai: daftar.reduce((n, a) => n + a.nilaiPerolehan, 0) }
}
