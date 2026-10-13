import { z } from 'zod'
import { persiapanSchema } from '../wilayah/persiapan'
import { desaSchema } from '../wilayah/schema'
import { PAKET } from './filter'

export { filterDesaKonsolSchema, HARGA_TRIWULAN, PAKET, type FilterDesaKonsol, type Paket } from './filter'

const tanggal = z.iso.date()
const waktu = z.iso.datetime({ offset: true })
const jumlah = z.number().int().min(0)
const kodeNama = z.object({ kode: z.string(), nama: z.string() })

export const PERAN_KONSOL = ['tim', 'pemantau'] as const
export type PeranKonsol = (typeof PERAN_KONSOL)[number]
export const LABEL_PERAN_KONSOL: Readonly<Record<PeranKonsol, string>> = { tim: 'Tim Sinfodes', pemantau: 'Pemantau wilayah' }

/** Akun Konsol (SPEC §11). Pemantau dibatasi ke `wilayah` (kabupaten, kode bertitik); Tim Sinfodes melihat semua desa. */
export const penggunaKonsolSchema = z
  .object({
    id: z.string(),
    nama: z.string(),
    jabatan: z.string(),
    peran: z.enum(PERAN_KONSOL),
    email: z.string(),
    wilayah: kodeNama.nullable(),
  })
  .refine((p) => (p.peran === 'pemantau') === (p.wilayah !== null), { message: 'Hanya pemantau yang punya wilayah', path: ['wilayah'] })
export type PenggunaKonsol = z.infer<typeof penggunaKonsolSchema>

export const sesiKonsolSchema = z.object({ jenis: z.literal('konsol'), pengguna: penggunaKonsolSchema })
export type SesiKonsol = z.infer<typeof sesiKonsolSchema>

/** Tagihan langganan per triwulan (dummy; tanpa pembayaran). */
export const tagihanSchema = z.object({
  nomor: z.string(),
  periode: z.string(),
  jumlah: z.number().int().positive(),
  terbit: tanggal,
  jatuhTempo: tanggal,
  dibayar: tanggal.nullable(),
})
export type Tagihan = z.infer<typeof tagihanSchema>

export const langgananSchema = z.object({
  desaId: z.string(),
  paket: z.enum(PAKET),
  /** Masa aktif; keduanya null selama desa belum berlangganan (Persiapan). */
  mulai: tanggal.nullable(),
  sampai: tanggal.nullable(),
  tagihan: z.array(tagihanSchema),
})
export type Langganan = z.infer<typeof langgananSchema>

const desaInti = desaSchema.pick({ id: true, slug: true, nama: true, kodeDesa: true, kecamatan: true, kabupaten: true, provinsi: true, status: true })

/** Satu baris Daftar desa (SPEC §11). */
export const barisDesaKonsolSchema = desaInti.extend({
  paket: z.enum(PAKET),
  penggunaAktif: jumlah,
  aktivitasTerakhir: waktu.nullable(),
  /** Rasio penduduk hidup yang field wajibnya terisi (SPEC §11); null bila desa belum punya data penduduk. */
  kelengkapan: z.number().min(0).max(1).nullable(),
})
export type BarisDesaKonsol = z.infer<typeof barisDesaKonsolSchema>

const kontakOrang = z.object({ nama: z.string(), email: z.string() })

/** GET /konsol/desa/:id: isi empat tab Detail desa (SPEC §11). */
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
  jiwa: jumlah,
  persiapan: persiapanSchema,
  /** 12 bulan terakhir, terlama dulu. */
  suratPerBulan: z.array(z.object({ bulan: z.string().regex(/^\d{4}-\d{2}$/), jumlah })),
  /** 12 minggu terakhir, terlama dulu; `mulai` adalah Senin minggu itu. */
  masukPerMinggu: z.array(z.object({ mulai: tanggal, jumlah })),
  langganan: langgananSchema.omit({ desaId: true }),
})
export type DetailDesaKonsol = z.infer<typeof detailDesaKonsolSchema>

/** Butir "Perlu perhatian" di Ringkasan (SPEC §11). */
export const perhatianSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('tidak-aktif'), jumlah: z.number().int().min(1) }),
  z.object({ jenis: z.literal('berhenti-impor'), jumlah: z.number().int().min(1) }),
  z.object({ jenis: z.literal('tagihan-lewat'), jumlah: z.number().int().min(1) }),
])
export type Perhatian = z.infer<typeof perhatianSchema>

/** GET /konsol/ringkasan. Untuk pemantau, semua angka dibatasi ke wilayahnya dan tanpa butir tagihan. */
export const ringkasanKonsolSchema = z.object({
  /** "Semua desa" atau "Kabupaten Pelalawan". */
  cakupan: z.string(),
  perhatian: z.array(perhatianSchema),
  desa: z.object({ aktif: jumlah, ujiCoba: jumlah, persiapan: jumlah, ditangguhkan: jumlah }),
  suratMingguIni: jumlah,
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
})
export type TambahDesa = z.infer<typeof tambahDesaSchema>
export const hasilTambahDesaSchema = z.object({ id: z.string(), nama: z.string(), email: z.string() })

/** POST /konsol/desa/:id/sekdes (tahap 6C): undang Sekretaris Desa untuk desa yang belum punya. */
export const undangSekdesSchema = z.object({
  nama: z.string().trim().min(2, 'Nama wajib diisi').max(60, 'Paling banyak 60 karakter'),
  email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email belum benar.'),
})
export type UndangSekdes = z.infer<typeof undangSekdesSchema>
export const hasilUndangSekdesSchema = z.object({ nama: z.string(), email: z.string() })
