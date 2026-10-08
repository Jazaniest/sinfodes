import { describe, expect, it } from 'vitest'
import { buatAcak } from './prng'

describe('buatAcak', () => {
  it('seed sama menghasilkan urutan sama', () => {
    const a = buatAcak(42)
    const b = buatAcak(42)
    expect(Array.from({ length: 5 }, () => a.angka())).toEqual(Array.from({ length: 5 }, () => b.angka()))
  })
  it('bulat mencakup kedua ujung', () => {
    const acak = buatAcak(1)
    const hasil = new Set(Array.from({ length: 2000 }, () => acak.bulat(1, 3)))
    expect([...hasil].sort()).toEqual([1, 2, 3])
  })
  it('berbobot mengikuti bobot', () => {
    const acak = buatAcak(7)
    const n = 10000
    const ya = Array.from({ length: n }, () => acak.berbobot([['ya', 70], ['tidak', 30]] as const)).filter((x) => x === 'ya')
    expect(ya.length / n).toBeGreaterThan(0.67)
    expect(ya.length / n).toBeLessThan(0.73)
  })
  it('acakUrutan adalah permutasi', () => {
    const hasil = buatAcak(3).acakUrutan([1, 2, 3, 4, 5])
    expect([...hasil].sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('id unik dengan awalan', () => {
    const acak = buatAcak(9)
    const ids = Array.from({ length: 3000 }, () => acak.id('pdk'))
    expect(new Set(ids).size).toBe(3000)
    expect(ids[0]).toMatch(/^pdk_[0-9a-z]{6}$/)
  })
})
