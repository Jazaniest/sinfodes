import { z } from 'zod'
import { perhatianSchema } from '../konsol/schema'

/** Peran akun kabupaten (SPEC-V0.2 §8.1). Admin pertama dibuat Tim Sinfodes dari surat penunjukan kabupaten. */
export const PERAN_KABUPATEN = ['admin', 'peninjau'] as const
export type PeranKabupaten = (typeof PERAN_KABUPATEN)[number]
export const LABEL_PERAN_KABUPATEN: Readonly<Record<PeranKabupaten, string>> = { admin: 'Admin Kabupaten', peninjau: 'Peninjau' }

const tanggal = z.iso.date()
/** Kode kabupaten bertitik, sama dengan `desa.kabupaten.kode`, mis. "14.05". */
const kodeKabupaten = z.string().regex(/^\d{2}\.\d{2}$/)
const kodeNama = z.object({ kode: z.string(), nama: z.string() })

export const penggunaKabupatenSchema = z.object({
  id: z.string(),
  kabupatenKode: kodeKabupaten,
  nama: z.string(),
  jabatan: z.string(),
  peran: z.enum(PERAN_KABUPATEN),
  email: z.string(),
  aktif: z.boolean(),
})
export type PenggunaKabupaten = z.infer<typeof penggunaKabupatenSchema>

/** Kabupaten mitra (SPEC-V0.2 §7, §8.1). Kabupaten tidak membayar; yang berlangganan adalah desanya. */
export const kabupatenMitraSchema = z.object({
  kode: kodeKabupaten,
  nama: z.string(),
  /** Alamat portal, mis. "kab-pelalawan". */
  label: z.string(),
  provinsi: kodeNama,
  bergabung: tanggal,
  /** Demo tidak menyimpan isi PDF-nya; hanya nama berkas dan ukurannya (pola lampiran surat). */
  suratPenunjukan: z.object({ nomor: z.string(), tanggal, berkas: z.string(), ukuranKb: z.number().int().min(1) }),
})
export type KabupatenMitra = z.infer<typeof kabupatenMitraSchema>

export const identitasKabupatenSchema = kabupatenMitraSchema.pick({ kode: true, nama: true, label: true })
export type IdentitasKabupaten = z.infer<typeof identitasKabupatenSchema>

export const sesiKabupatenSchema = z.object({
  jenis: z.literal('kabupaten'),
  pengguna: penggunaKabupatenSchema,
  kabupaten: identitasKabupatenSchema,
})
export type SesiKabupaten = z.infer<typeof sesiKabupatenSchema>

const jumlah = z.number().int().min(0)

/**
 * GET /kabupaten/ringkasan (SPEC-V0.2 §8.3 butir 1). `bergabung` = desa Aktif dan Uji coba; `jumlahDesa` = semua desa di
 * kabupaten itu, pelanggan atau bukan. Butir Dana Desa, siaran, dan Indeks menyusul di 7B-2, 7B-3, dan 7C.
 */
export const ringkasanKabupatenSchema = z.object({
  kabupaten: kodeNama,
  perhatian: z.array(perhatianSchema),
  adopsi: z.object({ bergabung: jumlah, jumlahDesa: jumlah, aktif: jumlah, ujiCoba: jumlah, persiapan: jumlah, ditangguhkan: jumlah }),
})
export type RingkasanKabupaten = z.infer<typeof ringkasanKabupatenSchema>
