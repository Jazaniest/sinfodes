import { describe, expect, it } from 'vitest'
import { filterBalitaSchema, jadwalBerikut, jadwalPosyandu, teksJadwal } from './schema'

const SELASA_PEKAN_2 = { pekanKe: 2, hari: 2 }

describe('aturan kesehatan (SPEC §8)', () => {
  it('jadwal posyandu per bulan: hari tertentu pada pekan tertentu', () => {
    // 1 September 2026 jatuh pada hari Selasa.
    expect(jadwalPosyandu(SELASA_PEKAN_2, '2026-09')).toBe('2026-09-08')
    expect(jadwalPosyandu({ pekanKe: 2, hari: 3 }, '2026-09')).toBe('2026-09-09')
    expect(jadwalPosyandu({ pekanKe: 3, hari: 4 }, '2026-09')).toBe('2026-09-17')
    // 1 Oktober 2026 jatuh pada hari Kamis.
    expect(jadwalPosyandu(SELASA_PEKAN_2, '2026-10')).toBe('2026-10-13')
  })
  it('jadwal berikutnya: bulan ini bila belum lewat, selain itu bulan depan, termasuk ganti tahun', () => {
    expect(jadwalBerikut(SELASA_PEKAN_2, '2026-09-08')).toBe('2026-09-08')
    expect(jadwalBerikut(SELASA_PEKAN_2, '2026-09-24')).toBe('2026-10-13')
    expect(jadwalBerikut(SELASA_PEKAN_2, '2026-12-30')).toBe('2027-01-12')
  })
  it('aturan jadwal sebagai kalimat', () => expect(teksJadwal(SELASA_PEKAN_2)).toBe('Selasa pekan kedua'))
  it('filter balita: semua status, halaman pertama', () => {
    expect(filterBalitaSchema.parse({})).toEqual({ page: 1, pageSize: 25 })
    expect(filterBalitaSchema.safeParse({ status: 'gizi-buruk' }).success).toBe(false)
  })
})
