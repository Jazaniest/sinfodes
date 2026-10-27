import { describe, expect, it } from 'vitest'
import { kelasRealisasi } from './peta'

describe('kelas realisasi untuk lapisan peta (SPEC-V0.2 §8.3 butir 5)', () => {
  it('tertinggal, di bawah median, median ke atas, dan belum ada APBDes', () => {
    expect(kelasRealisasi(0.4, 0.632)).toBe('tertinggal')
    expect(kelasRealisasi(0.6, 0.632)).toBe('bawah')
    expect(kelasRealisasi(0.632, 0.632)).toBe('atas')
    expect(kelasRealisasi(0.9, 0.632)).toBe('atas')
    expect(kelasRealisasi(null, 0.632)).toBe('kosong')
    expect(kelasRealisasi(0.4, null)).toBe('atas')
  })
})
