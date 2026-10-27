import { z } from 'zod'
import { labelAlamatSah, PESAN_ALAMAT_TIDAK_SAH } from '../alamat/alamat'
import { persiapanSchema } from '../wilayah/persiapan'
import { desaSchema, STATUS_DESA } from '../wilayah/schema'
import { alasanSchema, PERIODE_TAGIHAN, tagihanSchema } from '../langganan/tagihan'
import { PAKET } from './filter'

export { filterDesaKonsolSchema, HARGA_TRIWULAN, PAKET, type FilterDesaKonsol, type Paket } from './filter'

const tanggal = z.iso.date()
const waktu = z.iso.datetime({ offset: true })
const jumlah = z.number().int().min(0)

/** Konsol hanya untuk Tim Sinfodes; peran pemantau pindah ke akun kabupaten (SPEC-V0.2 §7, §8.1). */
export const PERAN_KONSOL = ['tim'] as const
export type PeranKonsol = (typeof PERAN_KONSOL)[number]
export const LABEL_PERAN_KONSOL: Readonly<Record<PeranKonsol, string>> = { tim: 'Tim Sinfodes' }

/** Akun Konsol (SPEC §11). */
export const penggunaKonsolSchema = z.object({
  id: z.string(),
  nama: z.string(),
  jabatan: z.string(),
  peran: z.enum(PERAN_KONSOL),
  email: z.string(),
})
export type PenggunaKonsol = z.infer<typeof penggunaKonsolSchema>

export const sesiKonsolSchema = z.object({ jenis: z.literal('konsol'), pengguna: penggunaKonsolSchema })
export type SesiKonsol = z.infer<typeof sesiKonsolSchema>

/** POST /konsol/sesi/masuk. `kodeTotp` dari aplikasi autentikator; wajib di server nyata untuk akun yang memakai TOTP (SPEC-V0.3 §8.4). */
export const masukKonsolSchema = z.object({
  email: z.string().min(1),
  kataSandi: z.string().min(1),
  kodeTotp: z.string().regex(/^\d{6}$/).optional(),
})
export type MasukKonsol = z.infer<typeof masukKonsolSchema>

/** `token` hanya ada pada mode demo; server nyata menaruh sesi di cookie HttpOnly (SPEC-V0.3 §8.1). */
export const hasilMasukKonsolSchema = z.object({ token: z.string().optional(), sesi: sesiKonsolSchema })

export const langgananSchema = z.object({
  desaId: z.string(),
  paket: z.enum(PAKET),
  /** Masa aktif; keduanya null selama desa belum berlangganan (Persiapan). */
  mulai: tanggal.nullable(),
  sampai: tanggal.nullable(),
  /** Tagihan ada di `db.tagihan` (7D-1); di sini hanya cara menagihnya. */
  periodeTagihan: z.enum(PERIODE_TAGIHAN),
})
export type Langganan = z.infer<typeof langgananSchema>

const desaInti = desaSchema.pick({ id: true, slug: true, nama: true, kodeDesa: true, kecamatan: true, kabupaten: true, provinsi: true, status: true })

/** Satu baris Daftar desa (SPEC §11). Tanpa isi data desa: Tim Sinfodes hanya melihat hubungan langganan (SPEC-V0.2 §5.1). */
export const barisDesaKonsolSchema = desaInti.extend({
  paket: z.enum(PAKET),
  penggunaAktif: jumlah,
  aktivitasTerakhir: waktu.nullable(),
})
export type BarisDesaKonsol = z.infer<typeof barisDesaKonsolSchema>

/** Satu perubahan status desa oleh Tim Sinfodes. */
export const riwayatStatusDesaSchema = z.object({
  dari: z.enum(STATUS_DESA),
  ke: z.enum(STATUS_DESA),
  alasan: z.string(),
  pada: waktu,
  oleh: z.object({ id: z.string(), nama: z.string() }),
})
export type RiwayatStatusDesaKonsol = z.infer<typeof riwayatStatusDesaSchema>

/** POST /konsol/desa/:id/status: status tujuan dan alasan wajib 10-300 karakter (rencana 7D-2 keputusan 7). */
export const ubahStatusDesaSchema = alasanSchema.extend({ ke: z.enum(STATUS_DESA, { error: 'Pilih status tujuan.' }) })
export type UbahStatusDesa = z.infer<typeof ubahStatusDesaSchema>

/** PUT /konsol/desa/:id/periode-tagihan. */
export const ubahPeriodeTagihanSchema = z.object({ periodeTagihan: z.enum(PERIODE_TAGIHAN, { error: 'Pilih periode tagihan.' }) })

const kontakOrang = z.object({ nama: z.string(), email: z.string() })

/** GET /konsol/desa/:id: isi empat tab Detail desa (SPEC §11, SPEC-V0.2 §7), tanpa isi data desa. */
export const detailDesaKonsolSchema = barisDesaKonsolSchema.extend({
  alamatKantor: z.string(),
  surel: z.string(),
  telepon: z.string(),
  kontak: z.object({ kades: z.string().nullable(), operator: kontakOrang.nullable(), sekdes: kontakOrang.nullable() }),
  /**
   * Tim Sinfodes bisa mengundang Sekretaris Desa (tahap 6C): desa berdata panel yang belum punya Sekretaris Desa aktif, satu-
   * satunya peran yang bisa menambah pengguna desa (SPEC §5.1). Desa contoh (rekaman) tidak punya akun sungguhan.
   */
  bisaUndangSekdes: z.boolean(),
  persiapan: persiapanSchema,
  /** Alamat lama desa ini (SPEC-V0.2 §4.2), urut seperti tersimpan. */
  aliasAlamat: z.array(z.string()),
  /** Nama modul yang menyala di desa ini (SPEC-V0.2 12.3), bagian Keaktifan; kosong bila belum ada. Bukan isi data desa. */
  modulAktif: z.array(z.string()),
  /** Pemakaian penyimpanan berkas desa, dalam KB. */
  penyimpananKb: jumlah,
  /** Akses bantuan yang sedang diberikan desa kepada Tim Sinfodes (SPEC-V0.2 §5.3), atau null. */
  aksesBantuan: z.object({ sampai: waktu, sembunyikanDataPribadi: z.boolean() }).nullable(),
  /** 12 minggu terakhir, terlama dulu; `mulai` adalah Senin minggu itu. */
  masukPerMinggu: z.array(z.object({ mulai: tanggal, jumlah })),
  langganan: langgananSchema.omit({ desaId: true }),
  /** Semua tagihan desa ini, termasuk yang dibatalkan; urut menurut periode (SPEC-V0.2 §10). */
  tagihan: z.array(tagihanSchema),
  /** Perubahan status desa oleh Tim Sinfodes, terbaru dulu (SPEC-V0.2 §7, §10.5). Tidak pernah dikirim ke kabupaten. */
  riwayatStatus: z.array(riwayatStatusDesaSchema),
})
export type DetailDesaKonsol = z.infer<typeof detailDesaKonsolSchema>

/** Butir "Perlu perhatian" di Ringkasan (SPEC §11). */
export const perhatianSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('tidak-aktif'), jumlah: z.number().int().min(1) }),
  z.object({ jenis: z.literal('berhenti-persiapan'), jumlah: z.number().int().min(1) }),
  z.object({ jenis: z.literal('tagihan-lewat'), jumlah: z.number().int().min(1) }),
  z.object({ jenis: z.literal('bukti-menunggu'), jumlah: z.number().int().min(1) }),
])
export type Perhatian = z.infer<typeof perhatianSchema>

/** GET /konsol/ringkasan: semua desa pelanggan. */
export const ringkasanKonsolSchema = z.object({
  perhatian: z.array(perhatianSchema),
  desa: z.object({ aktif: jumlah, ujiCoba: jumlah, persiapan: jumlah, ditangguhkan: jumlah }),
  /** Kabupaten mitra (SPEC-V0.2 §7). */
  kabupatenMitra: jumlah,
})
export type RingkasanKonsol = z.infer<typeof ringkasanKonsolSchema>

/** POST /konsol/desa (SPEC §11: Tambah desa). Kode desa 4 angka berawalan 2: desa, bukan kelurahan. */
export const tambahDesaSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, 'Nama desa minimal 3 huruf.')
    .max(60, 'Nama desa paling panjang 60 huruf.')
    // Slug (alamat website dan ID) dibentuk dari huruf dan angka ini; tanpa keduanya slug kosong dan desa tidak sah.
    .regex(/[a-z0-9]/i, 'Nama desa harus memuat huruf atau angka.'),
  kecamatan: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, 'Pilih kecamatan.'),
  kodeDesa: z.string().trim().regex(/^2\d{3}$/, 'Kode desa 4 angka berawalan 2, mis. 2015.'),
  paket: z.enum(PAKET),
  email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email admin belum benar.'),
  /** Alamat website desa (SPEC-V0.2 §4.2), diusulkan otomatis dan boleh diubah Tim Sinfodes. */
  alamat: z.string().trim().toLowerCase().refine(labelAlamatSah, PESAN_ALAMAT_TIDAK_SAH),
})
export type TambahDesa = z.infer<typeof tambahDesaSchema>
export const hasilTambahDesaSchema = z.object({ id: z.string(), nama: z.string(), email: z.string() })

/** PUT /konsol/desa/:id/alamat (SPEC-V0.2 §4.2): alamat lama disimpan sebagai alias selamanya. */
export const ubahAlamatSchema = tambahDesaSchema.pick({ alamat: true })
export const hasilUbahAlamatSchema = z.object({ slug: z.string(), aliasAlamat: z.array(z.string()) })

/** GET /konsol/alamat-desa: alamat pertama yang masih bebas untuk nama dan kecamatan ini (SPEC-V0.2 §4.2). */
export const usulanAlamatSchema = z.object({ usulan: z.string().nullable() })

export const STATUS_PERIKSA_ALAMAT = ['tersedia', 'dipakai', 'tidak-sah', 'sekarang'] as const
/** GET /konsol/alamat-desa/periksa: apakah sebuah alamat bisa dipakai desa ini. */
export const periksaAlamatSchema = z.object({ status: z.enum(STATUS_PERIKSA_ALAMAT), pesan: z.string() })
export type PeriksaAlamat = z.infer<typeof periksaAlamatSchema>

/** POST /konsol/desa/:id/tiket-bantuan: tiket sekali pakai untuk membuka panel desa, lihat saja (SPEC-V0.2 §5.3). */
export const tiketBantuanSchema = z.object({ tiket: z.string(), alamat: z.string() })

/** POST /konsol/desa/:id/sekdes (tahap 6C): undang Sekretaris Desa untuk desa yang belum punya. */
export const undangSekdesSchema = z.object({
  nama: z.string().trim().min(2, 'Nama wajib diisi').max(60, 'Paling banyak 60 karakter'),
  email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email belum benar.'),
})
export type UndangSekdes = z.infer<typeof undangSekdesSchema>
export const hasilUndangSekdesSchema = z.object({ nama: z.string(), email: z.string() })
