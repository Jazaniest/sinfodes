import { describe, expect, it } from 'vitest'
import { rasioKontras } from './kontras'

describe('rasioKontras', () => {
  it('hitam lawan putih = 21', () => {
    expect(rasioKontras('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })
  it('warna yang sama = 1', () => {
    expect(rasioKontras('#1F4E79', '#1F4E79')).toBeCloseTo(1, 5)
  })
  it('urutan argumen tidak berpengaruh', () => {
    expect(rasioKontras('#1B2631', '#F6F4EE')).toBeCloseTo(rasioKontras('#F6F4EE', '#1B2631'), 10)
  })
  it('menolak format selain #RRGGBB', () => {
    expect(() => rasioKontras('#FFF', '#000000')).toThrow('Warna tidak valid')
  })
})
