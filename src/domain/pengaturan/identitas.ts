import { z } from 'zod'
import { gambarDataUrlSchema, MAKS_GAMBAR_KB } from '../format/gambar'
import { galatDariZod } from '../format/galat-isian'
import { desaSchema } from '../wilayah/schema'

const jam = z.string().regex(/^([01]\d|2[0-3])\.[0-5]\d$/, 'Jam ditulis seperti 08.00')

/** Satu baris jam layanan, mis. "Senin–Kamis 08.00–15.00" (SPEC §12.1). */
export const jamLayananSchema = z
  .object({ hari: z.string().trim().min(1, 'Hari wajib diisi').max(30, 'Paling banyak 30 karakter'), buka: jam, tutup: jam })
  .refine((j) => j.buka < j.tutup, { message: 'Jam tutup harus sesudah jam buka', path: ['tutup'] })

/** PUT /pengaturan/desa: isian tab Identitas (SPEC §8). Kecamatan dan kabupaten diatur di Konsol, bukan di sini. */
export const identitasDesaSchema = z.object({
  nama: z.string().trim().min(2, 'Nama desa wajib diisi').max(60, 'Paling banyak 60 karakter'),
  kodeDesa: z.string().trim().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, 'Kode desa ditulis seperti 14.05.09.2009'),
  alamatKantor: z.string().trim().min(5, 'Alamat kantor wajib diisi').max(150, 'Paling banyak 150 karakter'),
  kodePos: z.string().trim().regex(/^\d{5}$/, 'Kode pos terdiri dari 5 angka'),
  surel: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Alamat surel tidak valid'),
  telepon: z.string().trim().regex(/^(\+62|0)\d{8,13}$/, 'Nomor telepon atau WhatsApp tidak valid'),
  jamLayanan: z.array(jamLayananSchema).min(1, 'Isi minimal satu jam layanan').max(7, 'Paling banyak 7 baris'),
  lambang: gambarDataUrlSchema(MAKS_GAMBAR_KB.lambang).nullable(),
})
export type IdentitasDesa = z.infer<typeof identitasDesaSchema>

/**
 * GET/PUT /pengaturan/desa. Respons memakai skema desa apa adanya, karena desa yang baru didaftarkan boleh belum lengkap
 * identitasnya; aturan lengkapnya hanya berlaku saat menyimpan.
 */
export const pengaturanDesaSchema = z.object({
  identitas: desaSchema.pick({
    nama: true, kodeDesa: true, alamatKantor: true, kodePos: true, surel: true, telepon: true, jamLayanan: true, lambang: true,
  }),
  kecamatan: z.string(),
  kabupaten: z.string(),
  /** Nama akun Kepala Desa yang aktif; null bila belum ada. Diubah lewat tab Pengguna. */
  kepalaDesa: z.string().nullable(),
})
export type PengaturanDesa = z.infer<typeof pengaturanDesaSchema>

/** Formulir Identitas. Jam memakai "HH:mm" seperti TimeField; API memakai "HH.mm". */
export type FormIdentitas = {
  nama: string
  kodeDesa: string
  alamatKantor: string
  kodePos: string
  surel: string
  telepon: string
  jamLayanan: { hari: string; buka: string | null; tutup: string | null }[]
  lambang: string | null
}

export const jamKeIsian = (jam: string): string => jam.replace('.', ':')
export const jamDariIsian = (jam: string | null): string => (jam ?? '').replace(':', '.')

export function formDariIdentitas(i: PengaturanDesa['identitas']): FormIdentitas {
  return {
    nama: i.nama,
    kodeDesa: i.kodeDesa,
    alamatKantor: i.alamatKantor,
    kodePos: i.kodePos,
    surel: i.surel,
    telepon: i.telepon,
    jamLayanan: i.jamLayanan.map((j) => ({ hari: j.hari, buka: jamKeIsian(j.buka), tutup: jamKeIsian(j.tutup) })),
    lambang: i.lambang ?? null,
  }
}

/** Isi PUT dari formulir: teks dirapikan dan jam kembali ke "HH.mm". */
export function isianIdentitas(f: FormIdentitas): IdentitasDesa {
  return {
    nama: f.nama.trim(),
    kodeDesa: f.kodeDesa.trim(),
    alamatKantor: f.alamatKantor.trim(),
    kodePos: f.kodePos.trim(),
    surel: f.surel.trim(),
    telepon: f.telepon.trim(),
    jamLayanan: f.jamLayanan.map((j) => ({ hari: j.hari.trim(), buka: jamDariIsian(j.buka), tutup: jamDariIsian(j.tutup) })),
    lambang: f.lambang,
  }
}

/** Galat per isian sebelum dikirim, dengan kunci yang sama dengan `fields` dari API. */
export function periksaIdentitas(f: FormIdentitas): Record<string, string> {
  const hasil = identitasDesaSchema.safeParse(isianIdentitas(f))
  return hasil.success ? {} : galatDariZod(hasil.error)
}
