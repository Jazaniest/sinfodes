import { describe, expect, it } from 'vitest'
import { apbdesSchema, jumlahKelompok, pembiayaanNetto, rasio, rincianPos, seimbang } from '@sinfodes/kontrak/keuangan/schema'
import { bangkitkanDb } from './index'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))
const [apbdes] = db.apbdes

describe('APBDes demo (SPEC §12.6)', () => {
  it('APBDes 2026 sesuai SPEC dan seimbang', () => {
    expect(db.apbdes).toHaveLength(1)
    expect(apbdesSchema.parse(apbdes)).toEqual(apbdes)
    expect(apbdes.tahun).toBe(2026)
    expect(jumlahKelompok(apbdes, 'pendapatan').anggaran).toBe(1_826_650_000)
    expect(jumlahKelompok(apbdes, 'belanja').anggaran).toBe(1_866_650_000)
    expect(pembiayaanNetto(apbdes).anggaran).toBe(40_000_000)
    expect(seimbang(apbdes)).toBe(true)
  })
  it('realisasi: pendapatan sekitar 72%, belanja sekitar 63%; tidak ada pos melebihi anggaran', () => {
    expect(rasio(jumlahKelompok(apbdes, 'pendapatan'))).toBeGreaterThan(0.7)
    expect(rasio(jumlahKelompok(apbdes, 'pendapatan'))).toBeLessThan(0.74)
    expect(rasio(jumlahKelompok(apbdes, 'belanja'))).toBeGreaterThan(0.61)
    expect(rasio(jumlahKelompok(apbdes, 'belanja'))).toBeLessThan(0.65)
    expect(apbdes.pos.every((p) => p.realisasi <= p.anggaran)).toBe(true)
  })
  it('bidang 5.2 adalah jumlah rincian kegiatannya; setiap kegiatan punya rincian (fokus review 1)', () => {
    const bidang = apbdes.pos.find((p) => p.kode === '5.2')
    const rincian = rincianPos(apbdes, '5.2')
    expect(bidang?.anggaran).toBe(rincian.reduce((n, r) => n + r.anggaran, 0))
    expect(bidang?.realisasi).toBe(rincian.reduce((n, r) => n + r.realisasi, 0))
    for (const k of db.kegiatan) expect(rincian.some((r) => r.kode === k.kodeApbdes), k.nama).toBe(true)
  })
  it('deret per bulan dari Januari sampai bulan berjalan, jumlahnya sama dengan realisasi', () => {
    expect(apbdes.bulanan.map((b) => b.bulan)).toEqual(Array.from({ length: 9 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`))
    expect(apbdes.bulanan.reduce((n, b) => n + b.pendapatan, 0)).toBe(jumlahKelompok(apbdes, 'pendapatan').realisasi)
    expect(apbdes.bulanan.reduce((n, b) => n + b.belanja, 0)).toBe(jumlahKelompok(apbdes, 'belanja').realisasi)
  })
  it('disinkronkan dari Siskeudes 4 hari sebelum tanggal acuan', () => expect(apbdes.sinkronPada.slice(0, 10)).toBe('2026-09-20'))
})
