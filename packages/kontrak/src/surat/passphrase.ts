import { z } from 'zod'

export const PESAN_PASSPHRASE_SALAH = 'Passphrase salah. Periksa kembali, lalu coba lagi.'
export const PESAN_PASSPHRASE_BELUM_ADA = 'Anda belum menetapkan passphrase tanda tangan.'
export const PESAN_PASSPHRASE_SAMA = 'Passphrase tidak boleh sama dengan kata sandi akun.'

/**
 * Menetapkan atau mengganti passphrase tanda tangan (Ruling 1 tahap 8F2b). Kata sandi akun diminta ulang di server; klien dan
 * server memakai skema yang sama supaya pesan 422 tidak menyimpang.
 */
export const aturPassphraseSchema = z
  .object({
    kataSandi: z.string().min(1, 'Kata sandi wajib diisi'),
    passphrase: z.string().min(8, 'Passphrase minimal 8 karakter.').max(128, 'Passphrase paling banyak 128 karakter.'),
  })
  .refine((v) => v.passphrase !== v.kataSandi, { path: ['passphrase'], message: PESAN_PASSPHRASE_SAMA })
export type AturPassphrase = z.infer<typeof aturPassphraseSchema>

/** Apakah pengguna sudah menetapkan passphrase. Hash-nya tidak pernah keluar dari server. */
export const statusPassphraseSchema = z.object({ diatur: z.boolean() })
export type StatusPassphrase = z.infer<typeof statusPassphraseSchema>
