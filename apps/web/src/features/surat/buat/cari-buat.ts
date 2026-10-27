import { z } from 'zod'
import type { JenisSurat } from '@/domain/surat/jenis'
import { bacaFilterUrl } from '../../admin/baca-filter'

const idPenduduk = z.string().regex(/^pdk_[a-z0-9_]+$/)

/** Parameter URL Buat surat (SPEC §7.4 layar 2): langkah, kode jenis, dan ID penduduk. NIK tidak pernah di URL. */
export const cariBuatSuratSchema = z.object({
  langkah: z.coerce.number().int().min(1).max(4).default(1),
  jenis: z.string().regex(/^[A-Z]{2,5}$/).optional(),
  pemohon: idPenduduk.optional(),
  /** Bayi (surat kelahiran) atau almarhum (surat kematian). */
  subjek: idPenduduk.optional(),
})
export type CariBuatSurat = z.infer<typeof cariBuatSuratSchema>

export const CARI_BUAT_BAWAAN: CariBuatSurat = cariBuatSuratSchema.parse({})

export const bacaCariBuatSurat = (cari: Record<string, unknown>): CariBuatSurat => bacaFilterUrl(cariBuatSuratSchema, cari)

export type Langkah = 1 | 2 | 3 | 4

/** Langkah yang boleh tampil: tanpa jenis → 1; tanpa pemohon (atau bayi/almarhum) → paling jauh 2. */
export function langkahSah(cari: CariBuatSurat, jenis: Pick<JenisSurat, 'subjek'> | null, pemohonAda: boolean): Langkah {
  if (!jenis) return 1
  const lengkap = pemohonAda && (jenis.subjek === 'pemohon' || cari.subjek !== undefined)
  return Math.min(cari.langkah, lengkap ? 4 : 2) as Langkah
}

/** Tautan ke Buat surat dari profil, laci, atau tawaran setelah mutasi. */
export function hrefBuatSurat(isi: Partial<CariBuatSurat>): string {
  const cari = new URLSearchParams()
  for (const [kunci, nilai] of Object.entries(isi)) if (nilai !== undefined) cari.set(kunci, String(nilai))
  const teks = cari.toString()
  return teks ? `/admin/surat/baru?${teks}` : '/admin/surat/baru'
}
