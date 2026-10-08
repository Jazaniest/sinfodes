import { afterEach, describe, expect, it } from 'vitest'
import { aturModeJaringan, bacaModeJaringan, jedaUntuk } from './jaringan'

afterEach(() => aturModeJaringan('instan'))

describe('mode jaringan (SPEC §3.6)', () => {
  it('bawaan di lingkungan uji adalah instan', () => expect(bacaModeJaringan()).toBe('instan'))
  it('pilihan disimpan', () => {
    aturModeJaringan('lambat')
    expect(bacaModeJaringan()).toBe('lambat')
    expect(localStorage.getItem('sinfodes.demo.jaringan')).toBe('lambat')
  })
  it('nilai rusak di penyimpanan diabaikan', () => {
    localStorage.setItem('sinfodes.demo.jaringan', 'kilat')
    expect(bacaModeJaringan()).toBe('instan')
  })
  it.each([
    ['instan', 0, 0],
    ['normal', 150, 400],
    ['lambat', 1500, 3000],
    ['gagal', 300, 300],
  ] as const)('jeda mode %s antara %d dan %d ms', (mode, min, maks) => {
    const jeda = jedaUntuk(mode)
    expect(jeda).toBeGreaterThanOrEqual(min)
    expect(jeda).toBeLessThanOrEqual(maks)
  })
})
