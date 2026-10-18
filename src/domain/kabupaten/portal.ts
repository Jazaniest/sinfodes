import { z } from 'zod'
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
  }),
])
export type PortalKabupaten = z.infer<typeof portalKabupatenSchema>
