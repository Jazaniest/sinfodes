import { z } from 'zod'
import { batangSchema, statistikPendudukSchema, type GrafikBatang, type StatistikPenduduk } from '../statistik/penduduk'

const batangPublikSchema = batangSchema.pick({ label: true, jumlah: true })
export type BatangPublik = z.infer<typeof batangPublikSchema>

/** Grafik batang Statistik publik. Kepemilikan KTP-el tidak ditampilkan: itu status dokumen per orang untuk petugas. */
export const GRAFIK_PUBLIK = ['perDusun', 'agama', 'pendidikan', 'pekerjaan', 'perkawinan'] as const satisfies readonly GrafikBatang[]
export type GrafikPublik = (typeof GRAFIK_PUBLIK)[number]

/** GET /publik/:slug/statistik (SPEC §9, §6.7): angka yang sama dengan panel admin, hanya agregat. */
export const statistikPublikSchema = statistikPendudukSchema
  .pick({ jiwa: true, laki: true, perempuan: true, kk: true, piramida: true })
  .extend({
    /** Tanggal hitung (YYYY-MM-DD, WIB). */
    tanggal: z.iso.date(),
    perDusun: z.array(batangPublikSchema),
    agama: z.array(batangPublikSchema),
    pendidikan: z.array(batangPublikSchema),
    pekerjaan: z.array(batangPublikSchema),
    perkawinan: z.array(batangPublikSchema),
  })
export type StatistikPublik = z.infer<typeof statistikPublikSchema>

/** Statistik panel admin → statistik publik: tanpa dusun terpilih, tanpa kunci filter daftar penduduk, tanpa KTP-el. */
export function keStatistikPublik(s: StatistikPenduduk, tanggal: string): StatistikPublik {
  const batang = (daftar: StatistikPenduduk[GrafikPublik]): BatangPublik[] => daftar.map(({ label, jumlah }) => ({ label, jumlah }))
  return {
    tanggal, jiwa: s.jiwa, laki: s.laki, perempuan: s.perempuan, kk: s.kk, piramida: s.piramida,
    perDusun: batang(s.perDusun), agama: batang(s.agama), pendidikan: batang(s.pendidikan), pekerjaan: batang(s.pekerjaan),
    perkawinan: batang(s.perkawinan),
  }
}
