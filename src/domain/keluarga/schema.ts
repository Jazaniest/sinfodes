import { z } from 'zod'

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
