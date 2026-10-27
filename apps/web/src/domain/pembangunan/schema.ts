import { z } from 'zod'
import { titikSchema } from '../peta/titik'

/** SPEC §8. */
export const STATUS_KEGIATAN = ['perencanaan', 'berjalan', 'selesai'] as const
export type StatusKegiatan = (typeof STATUS_KEGIATAN)[number]
export const LABEL_STATUS_KEGIATAN: Readonly<Record<StatusKegiatan, string>> = {
  perencanaan: 'Perencanaan',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
}
/** Urutan daftar: yang sedang berjalan dulu, lalu perencanaan, lalu yang sudah selesai. */
export const URUTAN_STATUS: Readonly<Record<StatusKegiatan, number>> = { berjalan: 0, perencanaan: 1, selesai: 2 }

export const SUMBER_DANA = ['DD', 'ADD', 'Bantuan Provinsi'] as const
export type SumberDana = (typeof SUMBER_DANA)[number]
export const LABEL_SUMBER_DANA: Readonly<Record<SumberDana, string>> = {
  DD: 'Dana Desa',
  ADD: 'Alokasi Dana Desa',
  'Bantuan Provinsi': 'Bantuan Provinsi Riau',
}

const tanggal = z.iso.date()

/** Dokumentasi progres 0%, 50%, dan 100% (SPEC §8). Foto diisi setelah kurasi foto (Tahap 5). */
export const dokumentasiSchema = z.object({
  persen: z.union([z.literal(0), z.literal(50), z.literal(100)]),
  tanggal,
  keterangan: z.string().min(1),
  foto: z.string().nullable(),
})
export type Dokumentasi = z.infer<typeof dokumentasiSchema>

/** Kegiatan pembangunan. Anggarannya tidak disimpan di sini, tetapi dibaca dari rincian APBDes (`kodeApbdes`). */
export const kegiatanSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  kodeApbdes: z.string().regex(/^5\.2\.\d{2}$/),
  nama: z.string().min(1),
  volume: z.string().nullable(),
  lokasi: z.string().min(1),
  dusunId: z.string(),
  sumberDana: z.enum(SUMBER_DANA),
  /** Tim Pelaksana Kegiatan (TPK). */
  pelaksana: z.string().min(1),
  mulai: tanggal.nullable(),
  targetSelesai: tanggal,
  progresFisik: z.number().int().min(0).max(100),
  status: z.enum(STATUS_KEGIATAN),
  titik: titikSchema,
  dokumentasi: z.array(dokumentasiSchema),
})
export type Kegiatan = z.infer<typeof kegiatanSchema>

/** GET /pembangunan/kegiatan: kegiatan beserta anggaran dan realisasi dari rincian APBDes. */
export const barisKegiatanSchema = kegiatanSchema.extend({ anggaran: z.number().int().min(0), realisasi: z.number().int().min(0) })
export type BarisKegiatan = z.infer<typeof barisKegiatanSchema>

/** Status mengikuti progres fisik: 0% dan belum mulai → Perencanaan; 100% → Selesai; selainnya Berjalan. */
export function statusKegiatan(progresFisik: number, mulai: string | null): StatusKegiatan {
  if (progresFisik >= 100) return 'selesai'
  if (progresFisik === 0 && mulai === null) return 'perencanaan'
  return 'berjalan'
}
