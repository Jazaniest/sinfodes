import { z } from 'zod'
import { pendudukSchema } from '../penduduk/schema'

const nomor3 = z.string().regex(/^\d{3}$/)

export const keluargaSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  nomorKk: z.string().regex(/^\d{16}$/),
  kepalaKeluargaId: z.string(),
  dusunId: z.string(),
  rw: nomor3,
  rt: nomor3,
  tanggalTerbit: z.iso.date(),
  anggotaIds: z.array(z.string()).min(1),
})
export type Keluarga = z.infer<typeof keluargaSchema>

/** Filter daftar KK (boleh masuk URL). Pencarian teks tidak di sini (SPEC §3.1). */
export const filterKeluargaSchema = z.object({
  dusun: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterKeluarga = z.infer<typeof filterKeluargaSchema>

/** Baris daftar KK (SPEC §6.5). */
export const barisKeluargaSchema = keluargaSchema.extend({
  namaKepala: z.string(),
  jumlahAnggota: z.number().int().min(1),
  diperbaruiPada: z.iso.datetime({ offset: true }),
})
export type BarisKeluarga = z.infer<typeof barisKeluargaSchema>

/** Detail KK: anggota urut sesuai KK. */
export const detailKeluargaSchema = z.object({ keluarga: keluargaSchema, anggota: z.array(pendudukSchema) })
export type DetailKeluarga = z.infer<typeof detailKeluargaSchema>
