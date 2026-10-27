import { z } from 'zod'
import { kategoriDesaSchema, kategoriKabupatenSchema } from '../indeks/schema'
import { titikSchema } from '../peta/titik'
import { identitasKabupatenSchema } from './schema'

const jumlah = z.number().int().min(0)

/**
 * Satu desa di portal publik kabupaten. Strict: halaman ini terbuka untuk siapa saja, jadi field di luar daftar ini membuat
 * respons tidak sah.
 */
export const desaPortalSchema = z.strictObject({
  /** Alamat website desa, mis. "sungaisialang". */
  label: z.string(),
  nama: z.string(),
  status: z.enum(['Aktif', 'Uji coba']),
})
export type DesaPortal = z.infer<typeof desaPortalSchema>

/**
 * Satu titik desa di peta portal [Usul]: diwarnai menurut kelompok bergabung (Aktif dan Uji coba) atau Persiapan saja, tanpa
 * angka apa pun, supaya tidak ada desa yang dipermalukan. Desa Persiapan belum punya website, jadi tanpa `label`.
 */
export const titikPortalSchema = z.strictObject({
  label: z.string().nullable(),
  nama: z.string(),
  kecamatan: z.string(),
  kelompok: z.enum(['bergabung', 'persiapan']),
  titik: titikSchema,
})
export type TitikPortal = z.infer<typeof titikPortalSchema>

/**
 * Podium desa bulan terakhir tutup, tingkat kabupaten (rencana 7C-2 butir 11). Strict: hanya nama, wilayah, alamat website, dan
 * nilai ukuran; tidak ada Indeks, tingkatan, skor, atau klasemen sementara.
 */
export const podiumPortalSchema = z.strictObject({
  periode: z.strictObject({ kode: z.string(), label: z.string() }),
  kategori: z.array(
    z.strictObject({
      kategori: kategoriDesaSchema,
      juara: z.array(
        z.strictObject({
          peringkat: z.number().int().min(1),
          bersama: z.boolean(),
          desa: z.strictObject({ nama: z.string(), kecamatan: z.string(), alamat: z.string() }),
          nilai: z.string(),
        }),
      ),
    }),
  ),
})
export type PodiumPortal = z.infer<typeof podiumPortalSchema>

/** Posisi se-provinsi, hanya untuk kategori yang kabupatennya masuk podium (peringkat 1-3). */
export const posisiProvinsiPortalSchema = z.array(
  z.strictObject({
    kategori: kategoriKabupatenSchema,
    peringkat: z.number().int().min(1).max(3),
    bersama: z.boolean(),
    dari: z.number().int().min(1),
    provinsi: z.string(),
  }),
)
export type PosisiProvinsiPortal = z.infer<typeof posisiProvinsiPortalSchema>

/**
 * GET /kabupaten/portal (SPEC-V0.2 §8.2), tanpa token; kabupaten dari alamat. Hanya desa bergabung (Aktif dan Uji coba) yang
 * didaftar, supaya daftar dan kalimat jumlahnya sama. Kecamatan dan desanya urut nama.
 */
export const portalKabupatenSchema = z.discriminatedUnion('mitra', [
  z.object({ mitra: z.literal(false), kabupaten: identitasKabupatenSchema }),
  z.object({
    mitra: z.literal(true),
    kabupaten: identitasKabupatenSchema,
    bergabung: jumlah,
    /** Semua desa di kabupaten itu, pelanggan atau bukan. */
    jumlahDesa: jumlah,
    kecamatan: z.array(z.object({ kecamatan: z.object({ kode: z.string(), nama: z.string() }), desa: z.array(desaPortalSchema) })),
    /** Peta desa (SPEC-V0.2 §8.2): desa bergabung dan Persiapan; desa Ditangguhkan tidak tampil. */
    peta: z.array(titikPortalSchema),
    podium: podiumPortalSchema,
    posisiProvinsi: posisiProvinsiPortalSchema,
  }),
])
export type PortalKabupaten = z.infer<typeof portalKabupatenSchema>
