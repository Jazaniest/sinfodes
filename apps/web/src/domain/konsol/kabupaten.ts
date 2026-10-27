import { z } from 'zod'
import { kabupatenMitraSchema, penggunaKabupatenSchema } from '../kabupaten/schema'
import { KABUPATEN } from '../wilayah/kode-wilayah'

const jumlah = z.number().int().min(0)

/** Surat penunjukan diunggah sebagai PDF (SPEC-V0.2 §7); demo hanya menyimpan nama berkas dan ukurannya. */
export const MAKS_SURAT_PENUNJUKAN_MB = 5

/** Satu baris di Konsol › Kabupaten (SPEC-V0.2 §7). Tanpa angka isi desa: hanya jumlah desa yang bergabung. */
export const barisKabupatenKonsolSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  label: z.string(),
  /** Admin aktif pertama (urut nama); null bila tidak ada Admin aktif. */
  admin: z.object({ nama: z.string(), email: z.string() }).nullable(),
  desaBergabung: jumlah,
  bergabung: z.iso.date(),
})
export type BarisKabupatenKonsol = z.infer<typeof barisKabupatenKonsolSchema>

/** GET /konsol/kabupaten/:kode: identitas, surat penunjukan, dan akun kabupatennya. */
export const detailKabupatenKonsolSchema = kabupatenMitraSchema.extend({
  desaBergabung: jumlah,
  pengguna: z.array(penggunaKabupatenSchema),
})
export type DetailKabupatenKonsol = z.infer<typeof detailKabupatenKonsolSchema>

const email = z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Alamat email tidak valid.')

/**
 * Bagian `data` (JSON) dari POST /konsol/kabupaten; surat penunjukan ikut sebagai berkas `suratPenunjukan` di FormData yang
 * sama. Admin pertama dibuat dari surat itu (SPEC-V0.2 §8.1).
 */
export const tambahKabupatenSchema = z.object({
  kabupaten: z.string().regex(/^\d{2}\.\d{2}$/, 'Pilih kabupaten.'),
  namaAdmin: z.string().trim().min(2, 'Nama Admin wajib diisi.').max(60, 'Paling banyak 60 karakter.'),
  emailAdmin: email,
  nomorSurat: z.string().trim().min(3, 'Nomor surat wajib diisi.').max(80, 'Paling banyak 80 karakter.'),
  tanggalSurat: z.iso.date('Tanggal surat wajib diisi.'),
})
export type TambahKabupaten = z.infer<typeof tambahKabupatenSchema>

export const hasilTambahKabupatenSchema = z.object({ kode: z.string(), nama: z.string(), label: z.string(), emailAdmin: z.string() })

/** PATCH /konsol/kabupaten/:kode/pengguna/:id: Tim Sinfodes hanya menonaktifkan dan mengaktifkan lagi. */
export const ubahAkunKabupatenKonsolSchema = z.object({ aktif: z.boolean() })
export type UbahAkunKabupatenKonsol = z.infer<typeof ubahAkunKabupatenKonsolSchema>

/**
 * Kode bertitik kabupaten yang ada di tabel kode wilayah. Kota (kode 71 ke atas) belum bisa jadi mitra: alamatnya berawalan
 * `kota-` dan tabel demo belum memuat nama resminya.
 */
export const kodeKabupatenSah = (kode: string): boolean =>
  /^\d{2}\.\d{2}$/.test(kode) && Number(kode.slice(3)) < 71 && kode.replace('.', '') in KABUPATEN
