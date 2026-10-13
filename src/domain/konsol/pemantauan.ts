import { z } from 'zod'
import { formatAngka } from '../format/angka'
import type { SelCsv } from '../format/csv'
import { STATUS_DESA, type StatusDesa } from '../wilayah/schema'

const jumlah = z.number().int().min(0)
const jam = z.number().min(0).nullable()
const rasio = z.number().min(0).nullable()
const kodeNama = z.object({ kode: z.string(), nama: z.string() })

/**
 * Satu desa di Pemantauan wilayah (SPEC §11 layar 5). Strict: pemantau hanya melihat angka agregat per desa, jadi field
 * di luar daftar ini (mis. data pribadi warga) membuat respons tidak sah.
 */
export const barisPemantauanDesaSchema = z.strictObject({
  id: z.string(),
  nama: z.string(),
  status: z.enum(STATUS_DESA),
  /** Surat Selesai yang terbit pada bulan berjalan (WIB). */
  suratBulanIni: jumlah,
  /** Median jam dari permohonan masuk sampai Selesai, untuk surat yang terbit 30 hari terakhir. */
  waktuLayananJam: jam,
  jiwa: jumlah,
  kelengkapan: z.number().min(0).max(1).nullable(),
  /** Median jam sampai balasan pertama desa, untuk pengaduan yang masuk 90 hari terakhir. */
  waktuTanggapanJam: jam,
  /** Belanja APBDes tahun berjalan; null bila desa belum punya APBDes tahun ini. */
  apbdes: z.object({ anggaran: z.number().min(0), realisasi: z.number().min(0) }).nullable(),
})
export type BarisPemantauanDesa = z.infer<typeof barisPemantauanDesaSchema>

/** Angka gabungan satu kecamatan atau satu kabupaten. */
export const ringkasanWilayahSchema = z.object({
  jumlahDesa: jumlah,
  adopsi: z.object({ aktif: jumlah, ujiCoba: jumlah, persiapan: jumlah, ditangguhkan: jumlah }),
  suratBulanIni: jumlah,
  waktuLayananJam: jam,
  kelengkapan: rasio,
  waktuTanggapanJam: jam,
  realisasiApbdes: rasio,
})
export type RingkasanWilayah = z.infer<typeof ringkasanWilayahSchema>

/** GET /konsol/pemantauan?wilayah=14.05 (SPEC §3.4). Kecamatan dan desanya urut nama. */
export const pemantauanSchema = z.object({
  wilayah: kodeNama,
  /** Bulan berjalan, "YYYY-MM". */
  bulan: z.string().regex(/^\d{4}-\d{2}$/),
  total: ringkasanWilayahSchema,
  kecamatan: z.array(ringkasanWilayahSchema.extend({ kecamatan: kodeNama, desa: z.array(barisPemantauanDesaSchema) })),
})
export type Pemantauan = z.infer<typeof pemantauanSchema>

/** Median; null untuk daftar kosong, supaya tidak tampil NaN atau "0 jam" palsu. */
export function median(nilai: readonly number[]): number | null {
  if (nilai.length === 0) return null
  const urut = [...nilai].sort((a, b) => a - b)
  const tengah = Math.floor(urut.length / 2)
  return urut.length % 2 === 1 ? urut[tengah] : (urut[tengah - 1] + urut[tengah]) / 2
}

/** Satu desimal: median jam stabil dan mudah dibandingkan antara Konsol dan panel desa. */
export const bulatJam = (jam: number | null): number | null => (jam === null ? null : Math.round(jam * 10) / 10)

const KUNCI_ADOPSI: Readonly<Record<StatusDesa, keyof RingkasanWilayah['adopsi']>> = {
  Aktif: 'aktif',
  'Uji coba': 'ujiCoba',
  Persiapan: 'persiapan',
  Ditangguhkan: 'ditangguhkan',
}

const tanpaNull = (nilai: readonly (number | null)[]): number[] => nilai.flatMap((n) => (n === null ? [] : [n]))

/**
 * Angka gabungan kecamatan atau kabupaten. Kelengkapan ditimbang jumlah jiwa, realisasi APBDes dari jumlah realisasi dibagi
 * jumlah anggaran, dan waktu adalah median dari median desa (data per surat tidak dikirim ke Konsol). Desa tanpa angka tidak
 * ikut dihitung; bila semuanya kosong, hasilnya null.
 */
export function ringkasWilayah(desa: readonly BarisPemantauanDesa[]): RingkasanWilayah {
  const adopsi = { aktif: 0, ujiCoba: 0, persiapan: 0, ditangguhkan: 0 }
  for (const d of desa) adopsi[KUNCI_ADOPSI[d.status]]++
  const berdata = desa.filter((d) => d.kelengkapan !== null && d.jiwa > 0)
  const jiwa = berdata.reduce((n, d) => n + d.jiwa, 0)
  const apbdes = desa.flatMap((d) => (d.apbdes ? [d.apbdes] : []))
  const anggaran = apbdes.reduce((n, a) => n + a.anggaran, 0)
  return {
    jumlahDesa: desa.length,
    adopsi,
    suratBulanIni: desa.reduce((n, d) => n + d.suratBulanIni, 0),
    waktuLayananJam: bulatJam(median(tanpaNull(desa.map((d) => d.waktuLayananJam)))),
    kelengkapan: jiwa > 0 ? berdata.reduce((n, d) => n + (d.kelengkapan ?? 0) * d.jiwa, 0) / jiwa : null,
    waktuTanggapanJam: bulatJam(median(tanpaNull(desa.map((d) => d.waktuTanggapanJam)))),
    realisasiApbdes: anggaran > 0 ? apbdes.reduce((n, a) => n + a.realisasi, 0) / anggaran : null,
  }
}

/** Rasio realisasi belanja satu desa; null bila belum ada APBDes atau anggarannya 0. */
export const rasioApbdes = (a: BarisPemantauanDesa['apbdes']): number | null => (a && a.anggaran > 0 ? a.realisasi / a.anggaran : null)

export const KOLOM_CSV_PEMANTAUAN = [
  'Kecamatan', 'Desa', 'Status', 'Surat terbit bulan ini', 'Median waktu layanan (jam)', 'Kelengkapan data (%)',
  'Median tanggapan pengaduan (jam)', 'Realisasi APBDes (%)',
] as const

const satuDesimal = (n: number | null): SelCsv => (n === null ? null : formatAngka(n, 1))
const persen = (r: number | null): SelCsv => (r === null ? null : formatAngka(r * 100, 1))

/** Isi CSV Pemantauan (SPEC §11: Unduh CSV): satu baris per desa; desimal memakai koma seperti Excel berbahasa Indonesia. */
export function barisCsvPemantauan(p: Pemantauan): SelCsv[][] {
  return [
    [...KOLOM_CSV_PEMANTAUAN],
    ...p.kecamatan.flatMap((k) =>
      k.desa.map((d): SelCsv[] => [
        k.kecamatan.nama, d.nama, d.status, d.suratBulanIni, satuDesimal(d.waktuLayananJam), persen(d.kelengkapan),
        satuDesimal(d.waktuTanggapanJam), persen(rasioApbdes(d.apbdes)),
      ]),
    ),
  ]
}
