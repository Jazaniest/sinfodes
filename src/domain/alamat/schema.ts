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
