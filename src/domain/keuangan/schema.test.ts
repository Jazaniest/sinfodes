import { describe, expect, it } from 'vitest'
import {
  apbdesSchema, jumlahKelompok, kumulatif, pembiayaanNetto, posUtama, rasio, rincianPos, seimbang, type Apbdes, type PosApbdes,
} from './schema'

const pos = (kode: string, kelompok: PosApbdes['kelompok'], nama: string, anggaran: number, realisasi = 0, induk: string | null = null): PosApbdes => ({
  kode, induk, kelompok, nama, anggaran, realisasi,
})

/** APBDes 2026 sesuai SPEC §12.6, dengan dua rincian kegiatan di bawah bidang 5.2. */
const APBDES: Apbdes = {
  id: 'apb_ss_2026', desaId: 'desa_sungai_sialang', tahun: 2026, sinkronPada: '2026-09-20T14:20:00+07:00',
  pos: [
    pos('4.2.1', 'pendapatan', 'Dana Desa', 1_018_450_000, 763_838_000),
    pos('4.2.3', 'pendapatan', 'Alokasi Dana Desa', 624_300_000),
    pos('4.2.2', 'pendapatan', 'Bagi hasil pajak dan retribusi', 48_700_000),
    pos('4.2.4', 'pendapatan', 'Bantuan keuangan Provinsi Riau', 100_000_000),
    pos('4.1.1', 'pendapatan', 'PADes (BUMDes, sewa tanah kas desa)', 35_200_000),
    pos('5.1', 'belanja', 'Penyelenggaraan Pemerintahan Desa', 612_400_000),
    pos('5.2', 'belanja', 'Pelaksanaan Pembangunan Desa', 748_900_000, 300_000_000),
    pos('5.2.01', 'belanja', 'Semenisasi jalan lingkungan Dusun III', 245_000_000, 151_900_000, '5.2'),
    pos('5.2.02', 'belanja', 'Drainase RT 006–007', 98_000_000, 97_020_000, '5.2'),
    pos('5.3', 'belanja', 'Pembinaan Kemasyarakatan', 132_500_000),
    pos('5.4', 'belanja', 'Pemberdayaan Masyarakat', 214_350_000),
    pos('5.5', 'belanja', 'Penanggulangan Bencana, Darurat dan Mendesak', 158_500_000),
    pos('6.1.1', 'pembiayaan-penerimaan', 'SiLPA 2025', 65_000_000, 65_000_000),
    pos('6.2.1', 'pembiayaan-pengeluaran', 'Penyertaan modal BUMDes', 25_000_000),
  ],
  bulanan: [
    { bulan: '2026-01', pendapatan: 10, belanja: 5 },
    { bulan: '2026-02', pendapatan: 20, belanja: 15 },
    { bulan: '2026-03', pendapatan: 30, belanja: 0 },
  ],
}

describe('aturan APBDes (SPEC §8, §12.6)', () => {
  it('jumlah per kelompok hanya dari pos tingkat atas; rincian kegiatan tidak dihitung dua kali', () => {
    expect(apbdesSchema.parse(APBDES)).toEqual(APBDES)
    expect(jumlahKelompok(APBDES, 'pendapatan').anggaran).toBe(1_826_650_000)
    expect(jumlahKelompok(APBDES, 'belanja')).toEqual({ anggaran: 1_866_650_000, realisasi: 300_000_000 })
    expect(posUtama(APBDES, 'belanja').map((p) => p.kode)).toEqual(['5.1', '5.2', '5.3', '5.4', '5.5'])
    expect(rincianPos(APBDES, '5.2').map((p) => p.kode)).toEqual(['5.2.01', '5.2.02'])
  })
  it('pembiayaan netto dan keseimbangan: pendapatan + pembiayaan netto = belanja', () => {
    expect(pembiayaanNetto(APBDES)).toEqual({ anggaran: 40_000_000, realisasi: 65_000_000 })
    expect(seimbang(APBDES)).toBe(true)
    const timpang = { ...APBDES, pos: APBDES.pos.map((p) => (p.kode === '5.3' ? { ...p, anggaran: p.anggaran + 1 } : p)) }
    expect(seimbang(timpang)).toBe(false)
  })
  it('rasio aman: anggaran 0 menghasilkan 0, bukan NaN atau Infinity (fokus review 3)', () => {
    expect(rasio({ anggaran: 0, realisasi: 0 })).toBe(0)
    expect(rasio({ anggaran: 0, realisasi: 5 })).toBe(0)
    expect(rasio({ anggaran: 200, realisasi: 50 })).toBe(0.25)
  })
  it('deret kumulatif untuk grafik per bulan', () => {
    expect(kumulatif(APBDES.bulanan)).toEqual([
      { bulan: '2026-01', pendapatan: 10, belanja: 5 },
      { bulan: '2026-02', pendapatan: 30, belanja: 20 },
      { bulan: '2026-03', pendapatan: 60, belanja: 20 },
    ])
  })
})
