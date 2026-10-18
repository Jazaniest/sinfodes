import { z } from 'zod'
import type { PelanggaranPengguna } from '../pengaturan/pengguna'
import { PERAN_KABUPATEN, penggunaKabupatenSchema, type PenggunaKabupaten } from './schema'

const email = z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Alamat email tidak valid')

/**
 * POST /kabupaten/pengguna (SPEC-V0.2 §8.1). Di demo akunnya langsung aktif dengan kata sandi demo, seperti undangan pengguna
 * desa. Jabatan boleh kosong; server lalu memakai label perannya.
 */
export const tambahPenggunaKabupatenSchema = z.object({
  nama: z.string().trim().min(2, 'Nama wajib diisi').max(60, 'Paling banyak 60 karakter'),
  jabatan: z.string().trim().max(80, 'Paling banyak 80 karakter').optional(),
  email,
  peran: z.enum(PERAN_KABUPATEN),
})
export type TambahPenggunaKabupaten = z.infer<typeof tambahPenggunaKabupatenSchema>

/** PATCH /kabupaten/pengguna/:id: ganti peran, atau nonaktifkan dan aktifkan lagi. */
export const ubahPenggunaKabupatenSchema = z
  .object({ peran: z.enum(PERAN_KABUPATEN).optional(), aktif: z.boolean().optional() })
  .refine((u) => u.peran !== undefined || u.aktif !== undefined, { message: 'Tidak ada perubahan.' })
export type UbahPenggunaKabupaten = z.infer<typeof ubahPenggunaKabupatenSchema>

/** GET /kabupaten/pengguna. */
export const daftarPenggunaKabupatenSchema = z.array(penggunaKabupatenSchema)

const adminAktif = (p: PenggunaKabupaten) => p.aktif && p.peran === 'admin'

/**
 * Aturan akun kabupaten (SPEC-V0.2 §8.1). `pelakuId` null berarti Tim Sinfodes dari Konsol. Akun sendiri tidak diubah dari
 * dasbor kabupaten (pola Pengguna desa), dan setiap kabupaten mitra harus selalu punya Admin aktif supaya tidak terkunci dari
 * dasbornya sendiri. Keunikan email dicek terpisah karena menyangkut semua jenis akun.
 */
export function periksaAturanPenggunaKabupaten(
  semua: readonly PenggunaKabupaten[],
  pelakuId: string | null,
  sebelum: PenggunaKabupaten,
  sesudah: PenggunaKabupaten,
): PelanggaranPengguna | null {
  if (pelakuId !== null && sebelum.id === pelakuId) {
    return { kode: 'FORBIDDEN', field: null, pesan: 'Akun Anda sendiri tidak bisa diubah di sini.' }
  }
  const adminLain = semua.some((p) => p.id !== sesudah.id && p.kabupatenKode === sesudah.kabupatenKode && adminAktif(p))
  if (adminAktif(sebelum) && !adminAktif(sesudah) && !adminLain) {
    return { kode: 'CONFLICT', field: null, pesan: 'Kabupaten harus punya paling sedikit satu Admin aktif.' }
  }
  return null
}
