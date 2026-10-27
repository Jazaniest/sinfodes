import { z } from 'zod'
import { ringkasIndeksSchema } from '../indeks/schema'

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
const positif = z.number().int().min(1)

/**
 * Butir "Perlu perhatian" kabupaten (SPEC-V0.2 §8.3 butir 1). Tanpa butir tagihan: tagihan bukan urusan kabupaten (§5.1).
 * Butir siaran (7B-3): desa yang belum membuka siaran 30 hari terakhir yang tidak ditarik. Butir bernilai nol tidak dikirim.
 */
export const perhatianKabupatenSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('tidak-aktif'), jumlah: positif }),
  z.object({ jenis: z.literal('berhenti-persiapan'), jumlah: positif }),
  z.object({ jenis: z.literal('realisasi-tertinggal'), jumlah: positif }),
  z.object({ jenis: z.literal('siaran-belum-dibaca'), jumlah: positif }),
])
export type PerhatianKabupaten = z.infer<typeof perhatianKabupatenSchema>

/**
 * GET /kabupaten/ringkasan (SPEC-V0.2 §8.3 butir 1). `bergabung` = desa Aktif dan Uji coba; `jumlahDesa` = semua desa di
 * kabupaten itu, pelanggan atau bukan. `indeks`: rata-rata, sebaran tingkatan, dan posisi se-provinsi bulan terakhir tutup (SPEC-V0.2 §9.5).
 */
export const ringkasanKabupatenSchema = z.object({
  kabupaten: kodeNama,
  perhatian: z.array(perhatianKabupatenSchema),
  adopsi: z.object({ bergabung: jumlah, jumlahDesa: jumlah, aktif: jumlah, ujiCoba: jumlah, persiapan: jumlah, ditangguhkan: jumlah }),
  indeks: ringkasIndeksSchema,
})
export type RingkasanKabupaten = z.infer<typeof ringkasanKabupatenSchema>
