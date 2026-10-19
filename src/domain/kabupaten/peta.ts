import { z } from 'zod'
import { titikSchema } from '../peta/titik'
import { STATUS_DESA } from '../wilayah/schema'
import { tertinggal } from './dana-desa'

/** Lapisan Peta dasbor (SPEC-V0.2 §8.3 butir 5). Lapisan tingkatan Indeks dibangun di 7C. */
export const LAPISAN_PETA_KABUPATEN = ['status', 'realisasi'] as const
export type LapisanPetaKabupaten = (typeof LAPISAN_PETA_KABUPATEN)[number]
export const LABEL_LAPISAN_PETA_KABUPATEN: Readonly<Record<LapisanPetaKabupaten, string>> = {
  status: 'Status bergabung',
  realisasi: 'Realisasi Dana Desa',
}

export const KELAS_REALISASI = ['tertinggal', 'bawah', 'atas', 'kosong'] as const
export type KelasRealisasi = (typeof KELAS_REALISASI)[number]
export const LABEL_KELAS_REALISASI: Readonly<Record<KelasRealisasi, string>> = {
  tertinggal: 'Tertinggal',
  bawah: 'Di bawah median',
  atas: 'Median ke atas',
  kosong: 'Belum ada APBDes',
}

/** Kelas warna realisasi satu desa terhadap median kabupaten; tanpa median, desa ber-APBDes masuk "median ke atas". */
export function kelasRealisasi(rasio: number | null, median: number | null): KelasRealisasi {
  if (rasio === null) return 'kosong'
  if (tertinggal(rasio, median)) return 'tertinggal'
  return median !== null && rasio < median ? 'bawah' : 'atas'
}

/** Satu titik desa di Peta dasbor: hanya angka agregat yang juga tampil di Pemantauan dan Dana Desa. */
export const titikPetaKabupatenSchema = z.strictObject({
  id: z.string(),
  nama: z.string(),
  alamat: z.string(),
  kecamatan: z.string(),
  status: z.enum(STATUS_DESA),
  titik: titikSchema,
  jiwa: z.number().int().min(0),
  suratBulanIni: z.number().int().min(0),
  apbdes: z.object({ anggaran: z.number().min(0), realisasi: z.number().min(0) }).nullable(),
  tertinggal: z.boolean(),
})
export type TitikPetaKabupaten = z.infer<typeof titikPetaKabupatenSchema>

/** GET /kabupaten/peta. `tanpaTitik`: desa yang kecamatannya belum punya titik pusat, jadi tidak digambar. */
export const petaKabupatenSchema = z.object({
  kabupaten: z.object({ kode: z.string(), nama: z.string() }),
  medianRealisasi: z.number().min(0).nullable(),
  desa: z.array(titikPetaKabupatenSchema),
  tanpaTitik: z.number().int().min(0),
})
export type PetaKabupaten = z.infer<typeof petaKabupatenSchema>
