import { describe, expect, it } from 'vitest'
import {
  formatAngka,
  formatPersen,
  formatRupiah,
  formatUkuranKb,
  formatRupiahRingkas,
  terbilang,
  terbilangRupiah,
} from './angka'

describe('formatAngka dan formatPersen', () => {
  it('pemisah ribuan titik', () => expect(formatAngka(2812)).toBe('2.812'))
  it('desimal koma', () => expect(formatAngka(65.4, 1)).toBe('65,4'))
  it('negatif memakai tanda minus', () => expect(formatAngka(-1500)).toBe('−1.500'))
  it('persen dari rasio', () => expect(formatPersen(0.654)).toBe('65,4%'))
})

describe('formatRupiah', () => {
  it('tanpa spasi dan tanpa desimal', () => expect(formatRupiah(1250000)).toBe('Rp1.250.000'))
  it('negatif', () => expect(formatRupiah(-25000000)).toBe('−Rp25.000.000'))
})

describe('formatRupiahRingkas', () => {
  it.each([
    [1826650000, 'Rp1,83 M'],
    [1800000000, 'Rp1,8 M'],
    [620000000, 'Rp620 jt'],
    [624300000, 'Rp624,3 jt'],
    [48700000, 'Rp48,7 jt'],
    [48000, 'Rp48 rb'],
    [950, 'Rp950'],
  ])('%d → %s', (nilai, hasil) => expect(formatRupiahRingkas(nilai)).toBe(hasil))
})

describe('terbilang', () => {
  it.each([
    [0, 'nol'],
    [11, 'sebelas'],
    [15, 'lima belas'],
    [21, 'dua puluh satu'],
    [100, 'seratus'],
    [101, 'seratus satu'],
    [1000, 'seribu'],
    [1001, 'seribu satu'],
    [1250000, 'satu juta dua ratus lima puluh ribu'],
    [1826650000, 'satu miliar delapan ratus dua puluh enam juta enam ratus lima puluh ribu'],
  ])('%d → %s', (nilai, hasil) => expect(terbilang(nilai)).toBe(hasil))
  it('versi rupiah', () => expect(terbilangRupiah(300000)).toBe('tiga ratus ribu rupiah'))
  it('menolak negatif dan pecahan', () => {
    expect(() => terbilang(-1)).toThrow()
    expect(() => terbilang(1.5)).toThrow()
  })
})

describe('formatUkuranKb', () => {
  it('KB di bawah 1024, selain itu MB dengan satu desimal', () => {
    expect(formatUkuranKb(512)).toBe('512 KB')
    expect(formatUkuranKb(1536)).toBe('1,5 MB')
    expect(formatUkuranKb(2048)).toBe('2 MB')
  })
})
