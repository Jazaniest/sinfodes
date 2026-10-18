import { z } from 'zod'
import { STATUS_DESA } from '../wilayah/schema'

/** Desa pemilik alamat: cukup untuk kepala halaman masuk, berlaku untuk status apa pun (SPEC-V0.2 §4.3). */
export const desaAlamatSchema = z.object({
  label: z.string(),
  nama: z.string(),
  kecamatan: z.string(),
  kabupaten: z.string(),
  status: z.enum(STATUS_DESA),
  lambang: z.string().nullable(),
})
export type DesaAlamat = z.infer<typeof desaAlamatSchema>

/** GET /alamat: apa yang ada di alamat ini. `alias` berarti alamat lama yang harus dialihkan (SPEC-V0.2 §4.2). */
export const hasilAlamatSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('desa'), desa: desaAlamatSchema }),
  z.object({ jenis: z.literal('alias'), labelBaru: z.string() }),
  z.object({ jenis: z.literal('induk') }),
  z.object({ jenis: z.literal('konsol') }),
])
export type HasilAlamat = z.infer<typeof hasilAlamatSchema>

/** GET /induk/cari-desa: desa yang websitenya tayang, cukup untuk menuju alamatnya (SPEC-V0.2 §4.4). */
export const hasilCariDesaSchema = z.object({
  hasil: z.array(z.object({ label: z.string(), nama: z.string(), kecamatan: z.string(), kabupaten: z.string() })),
})
export type HasilCariDesa = z.infer<typeof hasilCariDesaSchema>

/** GET /induk/ringkasan: angka untuk halaman utama Sinfodes. `desaBergabung` = desa Aktif dan Uji coba. */
export const ringkasanIndukSchema = z.object({ desaBergabung: z.number().int().min(0) })
export type RingkasanInduk = z.infer<typeof ringkasanIndukSchema>
