import { z } from 'zod'
import { KATEGORI_PENGADUAN } from '../pengaduan/schema'
import { kunciKirimSchema } from './ajukan'

/** Bagian `data` POST /warga/pengaduan (multipart). Foto (opsional) dikirim sebagai berkas `foto`. */
export const kirimPengaduanWargaSchema = z.object({
  kunci: kunciKirimSchema,
  kategori: z.enum(KATEGORI_PENGADUAN),
  cerita: z
    .string()
    .trim()
    .min(20, 'Ceritakan masalahnya, paling sedikit 20 huruf.')
    .max(1000, 'Cerita paling banyak 1.000 karakter.'),
  lokasi: z.string().trim().max(150, 'Lokasi paling banyak 150 karakter.').nullable(),
})
export type KirimPengaduanWarga = z.infer<typeof kirimPengaduanWargaSchema>

export const hasilKirimPengaduanSchema = z.object({ id: z.string(), nomor: z.string() })

/** POST /warga/pengaduan/:id/balasan. */
export const balasanWargaSchema = z.object({
  isi: z.string().trim().min(1, 'Tulis balasan Anda.').max(1000, 'Balasan paling banyak 1.000 karakter.'),
})

const BATAS_JUDUL = 60

/** Judul pengaduan dari kalimat pertama cerita, paling panjang 60 huruf (SPEC §10 tidak meminta judul terpisah). */
export function judulDariCerita(cerita: string): string {
  const pertama = (cerita.trim().split(/(?<=[.!?])\s+|\n/)[0] ?? '').trim().replace(/[.!?]+$/, '')
  if (pertama.length <= BATAS_JUDUL) return pertama
  const potong = pertama.slice(0, BATAS_JUDUL)
  const spasi = potong.lastIndexOf(' ')
  return `${(spasi > BATAS_JUDUL / 2 ? potong.slice(0, spasi) : potong).trimEnd()}…`
}
