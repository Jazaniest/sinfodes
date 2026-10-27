import { z } from 'zod'
import { desaSchema } from '../wilayah/schema'
import { PESAN_PIN, POLA_PIN, POLA_WHATSAPP } from './akun'

const nik = z.string().regex(/^\d{16}$/, 'NIK terdiri dari 16 angka.')

/** POST /warga/masuk (SPEC §10). NIK dikirim di body, tidak pernah di URL (SPEC §3.1). */
export const masukWargaSchema = z.object({ nik, pin: z.string().regex(POLA_PIN, PESAN_PIN) })
export type MasukWarga = z.infer<typeof masukWargaSchema>

/** GET /warga/sesi: warga yang masuk beserta desanya, untuk kepala halaman dan Akun. */
export const sesiWargaSchema = z.object({
  jenis: z.literal('warga'),
  penduduk: z.object({ id: z.string(), nama: z.string(), nik: z.string().regex(/^\d{16}$/), keluargaId: z.string() }),
  desa: desaSchema,
  whatsapp: z.string().regex(POLA_WHATSAPP),
})
export type SesiWarga = z.infer<typeof sesiWargaSchema>

export const hasilMasukWargaSchema = z.object({ token: z.string(), sesi: sesiWargaSchema })

/** POST /warga/lupa-pin. Jawabannya sama untuk NIK terdaftar maupun tidak (fokus review 2). */
export const lupaPinSchema = z.object({ nik })
export const hasilLupaPinSchema = z.object({ pesan: z.string() })

/** PATCH /warga/akun: ganti PIN (wajib PIN lama) atau ganti nomor WhatsApp. Isinya diperiksa API dengan aturan di akun.ts. */
export const ubahAkunWargaSchema = z
  .object({ pinLama: z.string().optional(), pinBaru: z.string().optional(), whatsapp: z.string().optional() })
  .refine((u) => u.pinBaru !== undefined || u.whatsapp !== undefined, 'Tidak ada yang diubah.')
export type UbahAkunWarga = z.infer<typeof ubahAkunWargaSchema>
