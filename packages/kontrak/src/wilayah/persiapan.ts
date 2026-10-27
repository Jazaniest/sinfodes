import { z } from 'zod'

/** Lima langkah persiapan desa baru (SPEC §5.3), dipakai Beranda desa dan tab Persiapan di Konsol (SPEC §11). */
export const LANGKAH_PERSIAPAN = ['identitas', 'wilayah', 'impor', 'pengguna', 'jenis-surat'] as const
export type LangkahPersiapan = (typeof LANGKAH_PERSIAPAN)[number]

export const LABEL_LANGKAH_PERSIAPAN: Readonly<Record<LangkahPersiapan, string>> = {
  identitas: 'Isi identitas dan kop surat',
  wilayah: 'Atur wilayah (dusun/RW/RT)',
  impor: 'Impor data penduduk dari Excel',
  pengguna: 'Tambah pengguna',
  'jenis-surat': 'Pilih jenis surat yang dilayani',
}

export const persiapanSchema = z
  .array(z.object({ langkah: z.enum(LANGKAH_PERSIAPAN), selesai: z.boolean() }))
  .length(LANGKAH_PERSIAPAN.length)
export type Persiapan = z.infer<typeof persiapanSchema>

/** Langkah pertama yang belum selesai; null bila semua sudah selesai. */
export const langkahBerikut = (p: Persiapan): LangkahPersiapan | null => p.find((l) => !l.selesai)?.langkah ?? null

export const jumlahSelesai = (p: Persiapan): number => p.filter((l) => l.selesai).length

/** Persiapan desa tanpa data panel: `n` langkah pertama sudah selesai. */
export const persiapanBerurutan = (n: number): Persiapan => LANGKAH_PERSIAPAN.map((langkah, i) => ({ langkah, selesai: i < n }))
