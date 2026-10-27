import { z } from 'zod'

/** Kelompok pos APBDes (SPEC §8, §12.6). */
export const KELOMPOK_APBDES = ['pendapatan', 'belanja', 'pembiayaan-penerimaan', 'pembiayaan-pengeluaran'] as const
export type KelompokApbdes = (typeof KELOMPOK_APBDES)[number]

/** Bidang belanja yang rinciannya adalah kegiatan pembangunan (SPEC §8: anggaran kegiatan diambil dari APBDes). */
export const KODE_BIDANG_PEMBANGUNAN = '5.2'

const rupiah = z.number().int().min(0)

/** Satu pos APBDes. Pos tingkat atas (`induk` null) tampil di tabel; rincian kegiatan pembangunan berinduk "5.2". */
export const posApbdesSchema = z.object({
  kode: z.string().regex(/^\d+(\.\d+)*$/),
  induk: z.string().nullable(),
  kelompok: z.enum(KELOMPOK_APBDES),
  nama: z.string().min(1),
  anggaran: rupiah,
  realisasi: rupiah,
})
export type PosApbdes = z.infer<typeof posApbdesSchema>

export const apbdesSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  tahun: z.number().int(),
  pos: z.array(posApbdesSchema).min(1),
  /** Realisasi per bulan (bukan kumulatif), dari Januari sampai bulan berjalan. */
  bulanan: z.array(z.object({ bulan: z.string().regex(/^\d{4}-\d{2}$/), pendapatan: rupiah, belanja: rupiah })),
  /** Penanda "Disinkronkan dari Siskeudes · 20 Sep 2026" (SPEC §8). */
  sinkronPada: z.iso.datetime({ offset: true }),
})
export type Apbdes = z.infer<typeof apbdesSchema>

/** GET /keuangan/apbdes. Tanpa tahun berarti tahun berjalan. */
export const filterApbdesSchema = z.object({ tahun: z.coerce.number().int().min(2000).optional() })

export type Jumlah = { anggaran: number; realisasi: number }

/** Pos tingkat atas satu kelompok, sesuai urutan data (urutan tabel SPEC §12.6). */
export const posUtama = (a: Pick<Apbdes, 'pos'>, kelompok: KelompokApbdes): PosApbdes[] =>
  a.pos.filter((p) => p.kelompok === kelompok && p.induk === null)

/** Rincian di bawah satu pos, mis. kegiatan pembangunan di bawah bidang 5.2. */
export const rincianPos = (a: Pick<Apbdes, 'pos'>, kode: string): PosApbdes[] => a.pos.filter((p) => p.induk === kode)

/** Jumlah anggaran dan realisasi pos tingkat atas satu kelompok; rincian tidak dihitung dua kali. */
export function jumlahKelompok(a: Pick<Apbdes, 'pos'>, kelompok: KelompokApbdes): Jumlah {
  return posUtama(a, kelompok).reduce((j, p) => ({ anggaran: j.anggaran + p.anggaran, realisasi: j.realisasi + p.realisasi }), {
    anggaran: 0,
    realisasi: 0,
  })
}

/** Rasio realisasi terhadap anggaran; 0 bila anggarannya 0, supaya tidak tampil NaN% atau Infinity%. */
export const rasio = (j: Jumlah): number => (j.anggaran > 0 ? j.realisasi / j.anggaran : 0)

/** Pembiayaan netto = penerimaan − pengeluaran pembiayaan. */
export function pembiayaanNetto(a: Pick<Apbdes, 'pos'>): Jumlah {
  const terima = jumlahKelompok(a, 'pembiayaan-penerimaan')
  const keluar = jumlahKelompok(a, 'pembiayaan-pengeluaran')
  return { anggaran: terima.anggaran - keluar.anggaran, realisasi: terima.realisasi - keluar.realisasi }
}

/** Pemeriksaan keseimbangan (SPEC §12.6): pendapatan + pembiayaan netto = belanja. */
export function seimbang(a: Pick<Apbdes, 'pos'>): boolean {
  return jumlahKelompok(a, 'pendapatan').anggaran + pembiayaanNetto(a).anggaran === jumlahKelompok(a, 'belanja').anggaran
}

/** Deret kumulatif untuk grafik realisasi per bulan. */
export function kumulatif(bulanan: Apbdes['bulanan']): Apbdes['bulanan'] {
  let pendapatan = 0
  let belanja = 0
  return bulanan.map((b) => {
    pendapatan += b.pendapatan
    belanja += b.belanja
    return { bulan: b.bulan, pendapatan, belanja }
  })
}
