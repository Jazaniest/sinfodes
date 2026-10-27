import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { kunciPublik } from './publik'
import { segarkanKependudukan } from './segarkan'

describe('cache sesudah data berubah', () => {
  it('data kependudukan berubah → Statistik dan Beranda website desa ikut basi (alur demo 2, fokus review 3)', async () => {
    const qc = new QueryClient()
    qc.setQueryData(kunciPublik.statistik('sungaisialang'), { jiwa: 2812 })
    qc.setQueryData(kunciPublik.beranda('sungaisialang'), { angka: { jiwa: 2812 } })
    await segarkanKependudukan(qc)
    expect(qc.getQueryState(kunciPublik.statistik('sungaisialang'))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(kunciPublik.beranda('sungaisialang'))?.isInvalidated).toBe(true)
  })
})
