import { describe, expect, it } from 'vitest'
import {
  KATEGORI_DESA,
  KATEGORI_KABUPATEN,
  KATEGORI_SKOR,
  formatUkuran,
  lebihBaik,
  skorDari,
  tingkatanDari,
} from './kategori'

describe('kategori', () => {
  it('sembilan kategori desa, tujuh pertama berskor', () => {
    expect(KATEGORI_DESA).toHaveLength(9)
    expect(KATEGORI_SKOR).toEqual(KATEGORI_DESA.slice(0, 7))
    expect(KATEGORI_KABUPATEN).toEqual(['umum', 'merata'])
  })
  it('skor layanan linear 72 jam = 0 dan 2 jam = 100, dipotong', () => {
    expect(skorDari('layanan', 2)).toBe(100)
    expect(skorDari('layanan', 72)).toBe(0)
    expect(skorDari('layanan', 37)).toBe(50)
    expect(skorDari('layanan', 1)).toBe(100)
    expect(skorDari('layanan', 90)).toBe(0)
  })
  it('skor digital penuh pada 50%', () => {
    expect(skorDari('digital', 25)).toBe(50)
    expect(skorDari('digital', 60)).toBe(100)
  })
  it('kategori lain skornya sama dengan ukuran', () => {
    expect(skorDari('data', 93.46)).toBe(93.5)
    expect(skorDari('serapan', 120)).toBe(100)
  })
  it('batas tingkatan memakai Indeks', () => {
    expect(tingkatanDari(39.9)).toBe('rintisan')
    expect(tingkatanDari(40)).toBe('berkembang')
    expect(tingkatanDari(59.9)).toBe('berkembang')
    expect(tingkatanDari(60)).toBe('maju')
    expect(tingkatanDari(79.9)).toBe('maju')
    expect(tingkatanDari(80)).toBe('mandiri')
  })
  it('arah terbaik', () => {
    expect(lebihBaik('layanan')).toBe('kecil')
    expect(lebihBaik('umum')).toBe('besar')
    expect(lebihBaik('merata')).toBe('besar')
  })
  it('format ukuran', () => {
    expect(formatUkuran('layanan', 18.44)).toBe('18,4 jam')
    expect(formatUkuran('responsif', 81.2)).toBe('81,2')
    expect(formatUkuran('data', 93.5)).toBe('93,5%')
    expect(formatUkuran('umum', 72.5)).toBe('72,5')
    expect(formatUkuran('meningkat', 6.2)).toBe('+6,2 poin')
    expect(formatUkuran('meningkat', -1.5)).toBe('−1,5 poin')
    expect(formatUkuran('meningkat', 0)).toBe('0,0 poin')
    expect(formatUkuran('merata', 29.8)).toBe('29,8%')
  })
})
