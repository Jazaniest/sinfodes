import { describe, expect, it } from 'vitest'
import { kalimatAngkaDesa } from './angka'

describe('angka desa dalam kalimat (SPEC §9)', () => {
  it('jiwa, keluarga, dusun, RT, dan luas wilayah', () => {
    expect(kalimatAngkaDesa('Sungai Sialang', { jiwa: 2812, kk: 812, dusun: 4, rt: 20, luasKm2: 48.6 })).toBe(
      'Desa Sungai Sialang dihuni 2.812 jiwa dalam 812 keluarga, tersebar di 4 dusun dan 20 RT, dengan luas wilayah 48,6 km².',
    )
  })
  it('luas wilayah yang belum diisi tidak disebut', () => {
    expect(kalimatAngkaDesa('Tanjung Lamo', { jiwa: 0, kk: 0, dusun: 2, rt: 6, luasKm2: null })).toBe(
      'Desa Tanjung Lamo dihuni 0 jiwa dalam 0 keluarga, tersebar di 2 dusun dan 6 RT.',
    )
  })
})
