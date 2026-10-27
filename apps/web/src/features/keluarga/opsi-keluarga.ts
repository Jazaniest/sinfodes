import { z } from 'zod'
import type { DetailKeluarga } from '@/domain/keluarga/schema'

/** Ringkasan KK yang dipilih di formulir: cukup untuk label, alamat, dan jumlah anggota. */
export const opsiKeluargaSchema = z.object({
  id: z.string(),
  nomorKk: z.string(),
  namaKepala: z.string(),
  dusunId: z.string(),
  rw: z.string(),
  rt: z.string(),
  jumlahAnggota: z.number(),
})
export type OpsiKeluarga = z.infer<typeof opsiKeluargaSchema>

export function opsiDariDetail(d: DetailKeluarga): OpsiKeluarga {
  const kepala = d.anggota.find((a) => a.id === d.keluarga.kepalaKeluargaId)
  return {
    id: d.keluarga.id, nomorKk: d.keluarga.nomorKk, namaKepala: kepala?.nama ?? '', dusunId: d.keluarga.dusunId,
    rw: d.keluarga.rw, rt: d.keluarga.rt, jumlahAnggota: d.anggota.length,
  }
}
