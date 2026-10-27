import { z } from 'zod'
import { isianTambahanSchema, SUBJEK_SURAT, type SubjekSurat } from '../surat/jenis'

/** GET /warga/jenis-surat: jenis yang boleh diajukan online (SPEC §10), beserta syarat dan perkiraan waktunya. */
export const jenisSuratWargaSchema = z.object({
  id: z.string(),
  kode: z.string(),
  nama: z.string(),
  subjek: z.enum(SUBJEK_SURAT),
  isian: z.array(isianTambahanSchema),
  syarat: z.array(z.string().min(1)),
  /** Rata-rata hari kerja sampai selesai untuk jenis ini dalam 90 hari terakhir; null bila belum ada contohnya. */
  perkiraanHariKerja: z.number().int().min(0).nullable(),
})
export type JenisSuratWarga = z.infer<typeof jenisSuratWargaSchema>

/** Kunci acak dari HP: Kirim ulang dengan kunci yang sama tidak membuat data ganda (fokus review 1). */
export const kunciKirimSchema = z.string().min(8).max(64)

/**
 * Bagian `data` POST /warga/permohonan (multipart). Berkas lampiran dikirim sebagai `lampiran`,
 * urut sesuai daftar `lampiran` di sini.
 */
export const kirimPermohonanWargaSchema = z.object({
  kunci: kunciKirimSchema,
  jenisId: z.string().min(1),
  untukId: z.string().min(1),
  isian: z.record(z.string(), z.string().max(500)),
  lampiran: z.array(z.object({ syarat: z.string().min(1) })).max(10),
})
export type KirimPermohonanWarga = z.infer<typeof kirimPermohonanWargaSchema>

export const hasilKirimPermohonanSchema = z.object({ id: z.string(), tiket: z.string() })
export type HasilKirimPermohonan = z.infer<typeof hasilKirimPermohonanSchema>

const OPSIONAL = /\s*\(opsional\)\s*/i

/** Syarat bertanda "(opsional)" boleh dilewati; syarat lain wajib difoto. */
export const syaratWajib = (syarat: string): boolean => !OPSIONAL.test(syarat)
export const namaSyarat = (syarat: string): string => syarat.replace(OPSIONAL, '').trim()

export function teksPerkiraan(hariKerja: number | null): string {
  if (hariKerja === null) return 'Lama prosesnya belum bisa diperkirakan.'
  if (hariKerja === 0) return 'Biasanya selesai di hari yang sama.'
  return `Biasanya selesai dalam ${hariKerja} hari kerja.`
}

/** "2026-0581": nomor tiket dari tahun masuk dan nomor urut permohonan. */
export const nomorTiket = (p: { masukPada: string; noUrut: number }): string =>
  `${p.masukPada.slice(0, 4)}-${String(p.noUrut).padStart(4, '0')}`

/**
 * Calon "untuk siapa" (langkah 2): surat kelahiran untuk bayi di KK yang berumur di bawah 12 bulan; surat kematian
 * tidak online; surat lain untuk anggota KK mana pun (daftar anggota dari API hanya berisi yang hidup).
 */
export function calonUntuk<T extends { umurBulan: number }>(subjek: SubjekSurat, anggota: readonly T[]): T[] {
  if (subjek === 'kelahiran') return anggota.filter((a) => a.umurBulan < 12)
  if (subjek === 'kematian') return []
  return [...anggota]
}
