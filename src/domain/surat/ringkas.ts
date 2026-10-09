import { waktuIsoWib } from '../format/tanggal'
import type { Permohonan } from './permohonan'
import { hariKerjaBerlalu } from './waktu'

const HARI_MS = 86_400_000

/** Keadaan desa (SPEC §5.3): surat Selesai dalam 30 hari terakhir dan rata-rata lama selesainya (hari kerja, dibulatkan). */
export function ringkasSuratTerbit(
  permohonan: readonly Pick<Permohonan, 'status' | 'masukPada' | 'terbit'>[],
  sekarang: Date,
): { terbit30Hari: number; rataSelesaiHariKerja: number } {
  const batas = waktuIsoWib(new Date(sekarang.getTime() - 30 * HARI_MS))
  const lama = permohonan.flatMap((p) =>
    p.status === 'selesai' && p.terbit && p.terbit.pada >= batas ? [hariKerjaBerlalu(p.masukPada, p.terbit.pada)] : [],
  )
  const rata = lama.length === 0 ? 0 : Math.round(lama.reduce((a, b) => a + b, 0) / lama.length)
  return { terbit30Hari: lama.length, rataSelesaiHariKerja: rata }
}
