import { z } from 'zod'
import { formatAngka } from '../format/angka'
import type { SelCsv } from '../format/csv'
import { STATUS_DESA } from '../wilayah/schema'
import { rasioApbdes } from './pemantauan'

/** SPEC-V0.2 §8.3 butir 4 [Usul]: desa tertinggal bila realisasinya lebih dari 15 poin di bawah median kabupaten. */
export const BATAS_TERTINGGAL_POIN = 15

/**
 * Selisih dibulatkan ke 0,1 poin sebelum dibandingkan, supaya galat pecahan (60% - 45% = 15,0000001 poin) tidak menjadikan
 * selisih tepat 15 poin tertinggal. Tanpa rasio atau tanpa median, desa tidak pernah tertinggal.
 */
export function tertinggal(rasio: number | null, median: number | null): boolean {
  if (rasio === null || median === null) return false
  return Math.round((median - rasio) * 1000) / 10 > BATAS_TERTINGGAL_POIN
}

const rupiah = z.number().min(0)
const jumlah = z.number().int().min(0)
const kodeNama = z.object({ kode: z.string(), nama: z.string() })

/** Satu desa di Dana Desa: hanya pagu dan realisasi belanja APBDes (SPEC-V0.2 §5.1: kabupaten melihat ringkasannya saja). */
export const desaDanaDesaSchema = z.strictObject({
  id: z.string(),
  nama: z.string(),
  /** Alamat website desa, untuk tautan dari dasbor. */
  alamat: z.string(),
  status: z.enum(STATUS_DESA),
  /** Belanja APBDes tahun berjalan; null bila desa belum punya APBDes tahun ini. */
  apbdes: z.object({ anggaran: rupiah, realisasi: rupiah }).nullable(),
  tertinggal: z.boolean(),
})
export type DesaDanaDesa = z.infer<typeof desaDanaDesaSchema>

export const jumlahDanaSchema = z.object({ anggaran: rupiah, realisasi: rupiah, desaBerApbdes: jumlah, tertinggal: jumlah })
export type JumlahDana = z.infer<typeof jumlahDanaSchema>

/**
 * GET /kabupaten/dana-desa (SPEC-V0.2 §8.3 butir 4 [Usul]): realisasi belanja APBDes secara keseluruhan, belum dipisah per
 * sumber dana. Kecamatan dan desanya urut nama.
 */
export const danaDesaSchema = z.object({
  kabupaten: kodeNama,
  tahun: z.number().int(),
  /** Median rasio realisasi desa yang punya APBDes dengan pagu lebih dari 0; null bila tidak ada. */
  medianRealisasi: z.number().min(0).nullable(),
  total: jumlahDanaSchema,
  kecamatan: z.array(jumlahDanaSchema.extend({ kecamatan: kodeNama, desa: z.array(desaDanaDesaSchema) })),
})
export type DanaDesa = z.infer<typeof danaDesaSchema>

/** Jumlah pagu dan realisasi desa yang punya APBDes dengan pagu lebih dari 0, beserta jumlah desa tertinggal. */
export function ringkasDanaDesa(desa: readonly DesaDanaDesa[]): JumlahDana {
  const ber = desa.flatMap((d) => (d.apbdes && d.apbdes.anggaran > 0 ? [d.apbdes] : []))
  return {
    anggaran: ber.reduce((n, a) => n + a.anggaran, 0),
    realisasi: ber.reduce((n, a) => n + a.realisasi, 0),
    desaBerApbdes: ber.length,
    tertinggal: desa.filter((d) => d.tertinggal).length,
  }
}

export const KOLOM_CSV_DANA_DESA = [
  'Kecamatan', 'Desa', 'Status', 'Pagu belanja (Rp)', 'Realisasi belanja (Rp)', 'Realisasi (%)', 'Tertinggal',
] as const

/** Isi CSV Dana Desa: satu baris per desa, rupiah penuh, persen satu desimal dengan koma. */
export function barisCsvDanaDesa(d: DanaDesa): SelCsv[][] {
  return [
    [...KOLOM_CSV_DANA_DESA],
    ...d.kecamatan.flatMap((k) =>
      k.desa.map((x): SelCsv[] => {
        const rasio = rasioApbdes(x.apbdes)
        return [
          k.kecamatan.nama, x.nama, x.status, x.apbdes?.anggaran ?? null, x.apbdes?.realisasi ?? null,
          rasio === null ? null : formatAngka(rasio * 100, 1), x.tertinggal ? 'Ya' : null,
        ]
      }),
    ),
  ]
}
