import { describe, expect, it } from 'vitest'
import { teksUmurBalita } from './beranda'

describe('teksUmurBalita', () => {
  it('bulan saja di bawah 1 tahun; tahun dan bulan sesudahnya', () => {
    expect(teksUmurBalita(0)).toBe('kurang dari 1 bulan')
    expect(teksUmurBalita(5)).toBe('5 bulan')
    expect(teksUmurBalita(24)).toBe('2 tahun')
    expect(teksUmurBalita(34)).toBe('2 tahun 10 bulan')
  })
})
