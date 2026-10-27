import { z } from 'zod'
import { angkaRomawi } from '../format/romawi'
import { LABEL_PERAN, PERAN, PESAN_NIP, penggunaSchema, type Pengguna, type Peran } from '../pengguna/schema'
import type { Dusun } from '../wilayah/schema'

const surel = z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Alamat surel tidak valid')

/** POST /pengaturan/pengguna: undang pengguna baru (SPEC §8). Di demo akunnya langsung aktif. */
export const undangPenggunaSchema = z
  .object({
    nama: z.string().trim().min(2, 'Nama wajib diisi').max(60, 'Paling banyak 60 karakter'),
    email: surel,
    peran: z.enum(PERAN),
    dusunId: z.string().nullable(),
  })
  .refine((u) => u.peran !== 'kadus' || u.dusunId !== null, { message: 'Pilih dusun untuk Kepala Dusun', path: ['dusunId'] })
export type UndangPengguna = z.infer<typeof undangPenggunaSchema>

/** PATCH /pengaturan/pengguna/:id: ganti peran (beserta dusunnya), atau nonaktifkan dan aktifkan lagi. */
export const ubahPenggunaSchema = z
  .object({
    peran: z.enum(PERAN).optional(),
    dusunId: z.string().nullable().optional(),
    aktif: z.boolean().optional(),
    /** Kosong dikirim sebagai null. */
    nip: z.string().trim().regex(/^\d{18}$/, PESAN_NIP).nullable().optional(),
  })
  .refine((u) => u.peran !== undefined || u.aktif !== undefined || u.nip !== undefined, { message: 'Tidak ada perubahan.' })
export type UbahPengguna = z.infer<typeof ubahPenggunaSchema>

/** GET /pengaturan/pengguna. */
export const daftarPenggunaDesaSchema = z.array(penggunaSchema)

/** Jabatan bawaan dari peran, mis. "Kepala Dusun II". */
export function jabatanBawaan(peran: Peran, dusun: Pick<Dusun, 'nomor'> | null): string {
  if (peran === 'kadus') return dusun ? `Kepala Dusun ${angkaRomawi(dusun.nomor)}` : LABEL_PERAN.kadus
  if (peran === 'operator') return 'Operator Desa'
  return LABEL_PERAN[peran]
}

export type PelanggaranPengguna = { kode: 'FORBIDDEN' | 'CONFLICT' | 'VALIDATION'; field: string | null; pesan: string }

/**
 * Aturan akun pengguna (SPEC §8, fokus review 2). `semua` berisi pengguna semua desa, karena surel dipakai untuk masuk
 * dan harus unik di seluruh Sinfodes. `sebelum` null berarti akun baru (undangan).
 * Mengembalikan pelanggaran pertama, atau null bila perubahan boleh disimpan.
 */
export function periksaAturanPengguna(
  semua: readonly Pengguna[],
  pelakuId: string,
  sebelum: Pengguna | null,
  sesudah: Pengguna,
): PelanggaranPengguna | null {
  if (sebelum?.id === pelakuId) return { kode: 'FORBIDDEN', field: null, pesan: 'Akun Anda sendiri tidak bisa diubah di sini.' }
  const lain = semua.filter((p) => p.id !== sesudah.id)
  const surelSama = lain.find((p) => p.email === sesudah.email)
  if (surelSama) return { kode: 'CONFLICT', field: 'email', pesan: `Surel ini sudah dipakai ${surelSama.nama}.` }
  if (sesudah.peran === 'kadus' && sesudah.dusunId === null) {
    return { kode: 'VALIDATION', field: 'dusunId', pesan: 'Pilih dusun untuk Kepala Dusun' }
  }
  if (sesudah.aktif && (sesudah.peran === 'kades' || sesudah.peran === 'sekdes')) {
    const kembar = lain.find((p) => p.desaId === sesudah.desaId && p.aktif && p.peran === sesudah.peran)
    if (kembar) {
      return {
        kode: 'CONFLICT',
        field: 'peran',
        pesan: `Sudah ada ${LABEL_PERAN[sesudah.peran]} aktif: ${kembar.nama}. Ganti perannya atau nonaktifkan dulu.`,
      }
    }
  }
  return null
}
