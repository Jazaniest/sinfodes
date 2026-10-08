import { z } from 'zod'
import { keluargaSchema } from '../keluarga/schema'
import { pendudukSchema } from '../penduduk/schema'

/** POST /cari: hasil campuran pencarian cepat (SPEC §5.4). Halaman dan aksi disusun di layar. */
export const hasilCariSchema = z.object({
  penduduk: z.array(
    pendudukSchema.pick({
      id: true, nama: true, nik: true, jenisKelamin: true, tanggalLahir: true, dusunId: true, rw: true, rt: true, statusDasar: true,
    }),
  ),
  keluarga: z.array(
    keluargaSchema.pick({ id: true, nomorKk: true, dusunId: true, rw: true, rt: true }).extend({ namaKepala: z.string() }),
  ),
})
export type HasilCari = z.infer<typeof hasilCariSchema>
