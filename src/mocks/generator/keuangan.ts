import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { Apbdes, KelompokApbdes, PosApbdes } from '@/domain/keuangan/schema'
import type { Desa } from '@/domain/wilayah/schema'

type Opsi = { desa: Desa; rincianPembangunan: readonly PosApbdes[]; acuan: Date }
type Baris = readonly [kode: string, nama: string, anggaran: number, realisasi: number]

const HARI_MS = 86_400_000
const sampaiRibuan = (n: number) => Math.round(n / 1000) * 1000

/** SPEC §12.6. Rasio realisasi tetap per pos: pendapatan ±72%, belanja ±63%. */
const SUMBER: readonly Baris[] = [
  ['4.2.1', 'Dana Desa', 1_018_450_000, 0.75],
  ['4.2.3', 'Alokasi Dana Desa', 624_300_000, 0.7],
  ['4.2.2', 'Bagi hasil pajak dan retribusi', 48_700_000, 0.55],
  ['4.2.4', 'Bantuan keuangan Provinsi Riau', 100_000_000, 0.6],
  ['4.1.1', 'PADes (BUMDes, sewa tanah kas desa)', 35_200_000, 0.8],
]
const BIDANG: readonly Baris[] = [
  ['5.1', 'Penyelenggaraan Pemerintahan Desa', 612_400_000, 0.75],
  // Anggaran dan realisasi bidang 5.2 ditimpa jumlah rincian kegiatannya.
  ['5.2', 'Pelaksanaan Pembangunan Desa', 748_900_000, 0],
  ['5.3', 'Pembinaan Kemasyarakatan', 132_500_000, 0.55],
  ['5.4', 'Pemberdayaan Masyarakat', 214_350_000, 0.48],
  ['5.5', 'Penanggulangan Bencana, Darurat dan Mendesak (termasuk BLT-DD)', 158_500_000, 0.75],
]

/** Bobot musiman realisasi per bulan (Januari-Desember): pendapatan mengikuti tahap transfer, belanja lebih merata. */
const BOBOT_PENDAPATAN = [2, 10, 14, 6, 5, 16, 6, 10, 8, 4, 3, 16]
const BOBOT_BELANJA = [1, 4, 8, 8, 9, 10, 10, 11, 12, 9, 8, 10]

/** Bagi `total` ke bulan-bulan yang sudah berjalan sesuai bobotnya; bulan terakhir menampung sisa pembulatan. */
function bagi(total: number, bobot: readonly number[]): number[] {
  const jumlahBobot = bobot.reduce((n, b) => n + b, 0)
  const bagian = bobot.map((b) => sampaiRibuan((total * b) / jumlahBobot))
  bagian[bagian.length - 1] += total - bagian.reduce((n, b) => n + b, 0)
  return bagian
}

/**
 * APBDes tahun berjalan (SPEC §12.6). Bidang 5.2 dijumlahkan dari rincian kegiatan pembangunan, supaya anggaran
 * kegiatan dan APBDes selalu sama (SPEC §8).
 */
export function bangkitkanKeuangan(o: Opsi): Apbdes {
  const hariIni = tanggalIsoWib(o.acuan)
  const tahun = Number(hariIni.slice(0, 4))
  const bulanBerjalan = Number(hariIni.slice(5, 7))
  const pos = (kelompok: KelompokApbdes) => ([kode, nama, anggaran, rasioRealisasi]: Baris): PosApbdes => ({
    kode, induk: null, kelompok, nama, anggaran, realisasi: sampaiRibuan(anggaran * rasioRealisasi),
  })
  const rincian = [...o.rincianPembangunan]
  const bidang = BIDANG.map(pos('belanja')).map((p) =>
    p.kode === '5.2'
      ? { ...p, anggaran: rincian.reduce((n, r) => n + r.anggaran, 0), realisasi: rincian.reduce((n, r) => n + r.realisasi, 0) }
      : p,
  )
  const semuaPos: PosApbdes[] = [
    ...SUMBER.map(pos('pendapatan')),
    ...bidang,
    ...rincian,
    { kode: '6.1.1', induk: null, kelompok: 'pembiayaan-penerimaan', nama: `SiLPA ${tahun - 1}`, anggaran: 65_000_000, realisasi: 65_000_000 },
    { kode: '6.2.1', induk: null, kelompok: 'pembiayaan-pengeluaran', nama: 'Penyertaan modal BUMDes', anggaran: 25_000_000, realisasi: 25_000_000 },
  ]
  const totalPendapatan = semuaPos.filter((p) => p.kelompok === 'pendapatan' && p.induk === null).reduce((n, p) => n + p.realisasi, 0)
  const totalBelanja = bidang.reduce((n, p) => n + p.realisasi, 0)
  const pendapatan = bagi(totalPendapatan, BOBOT_PENDAPATAN.slice(0, bulanBerjalan))
  const belanja = bagi(totalBelanja, BOBOT_BELANJA.slice(0, bulanBerjalan))
  const tengahMalam = Date.parse(`${hariIni}T00:00:00+07:00`)
  return {
    id: `apb_${o.desa.kodeSurat.toLowerCase()}_${tahun}`,
    desaId: o.desa.id,
    tahun,
    pos: semuaPos,
    bulanan: pendapatan.map((p, i) => ({ bulan: `${tahun}-${String(i + 1).padStart(2, '0')}`, pendapatan: p, belanja: belanja[i] })),
    // "Disinkronkan dari Siskeudes · 20 Sep 2026" pada demo 24 Sep (SPEC §8): 4 hari sebelumnya, pukul 14.20.
    sinkronPada: waktuIsoWib(new Date(tengahMalam - 4 * HARI_MS + (14 * 60 + 20) * 60_000)),
  }
}
