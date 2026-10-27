import { describe, expect, it } from 'vitest'
import {
  bulanPeriode,
  daftarPeriode,
  labelPeriode,
  periodeBerjalan,
  periodeDari,
  periodeSebelumnya,
  periodeTerakhirTutup,
  tutupPada,
  uraiPeriode,
} from './periode'

const HARI_INI = new Date('2026-09-24T02:30:00Z')

describe('periode', () => {
  it('periodeDari dan label', () => {
    const p = periodeDari('triwulan', '2026-08')
    expect(p).toEqual({ musim: 'triwulan', kode: '2026-T3' })
    expect(labelPeriode(p)).toBe('Triwulan III 2026')
    expect(labelPeriode({ musim: 'bulanan', kode: '2026-08' })).toBe('Agustus 2026')
    expect(labelPeriode({ musim: 'tahunan', kode: '2026' })).toBe('Tahun 2026')
  })
  it('bulanPeriode terlama dulu', () => {
    expect(bulanPeriode({ musim: 'triwulan', kode: '2026-T3' })).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(bulanPeriode({ musim: 'tahunan', kode: '2025' })).toHaveLength(12)
    expect(bulanPeriode({ musim: 'bulanan', kode: '2026-02' })).toEqual(['2026-02'])
  })
  it('periodeSebelumnya', () => {
    expect(periodeSebelumnya({ musim: 'triwulan', kode: '2026-T1' }).kode).toBe('2025-T4')
    expect(periodeSebelumnya({ musim: 'bulanan', kode: '2026-01' }).kode).toBe('2025-12')
    expect(periodeSebelumnya({ musim: 'tahunan', kode: '2026' }).kode).toBe('2025')
  })
  it('periode berjalan dan terakhir tutup pada 24 Sep 2026', () => {
    expect(periodeBerjalan('bulanan', HARI_INI).kode).toBe('2026-09')
    expect(periodeBerjalan('triwulan', HARI_INI).kode).toBe('2026-T3')
    expect(periodeBerjalan('tahunan', HARI_INI).kode).toBe('2026')
    expect(periodeTerakhirTutup('bulanan', HARI_INI).kode).toBe('2026-08')
    expect(periodeTerakhirTutup('triwulan', HARI_INI).kode).toBe('2026-T2')
    expect(periodeTerakhirTutup('tahunan', HARI_INI).kode).toBe('2025')
  })
  it('tutupPada tanggal 1 pukul 00.00 WIB berikutnya', () => {
    expect(tutupPada({ musim: 'bulanan', kode: '2026-09' })).toBe('2026-10-01T00:00:00+07:00')
    expect(tutupPada({ musim: 'triwulan', kode: '2026-T4' })).toBe('2027-01-01T00:00:00+07:00')
    expect(tutupPada({ musim: 'tahunan', kode: '2026' })).toBe('2027-01-01T00:00:00+07:00')
  })
  it('uraiPeriode menolak bentuk salah', () => {
    expect(uraiPeriode('triwulan', '2026-T5')).toBeNull()
    expect(uraiPeriode('triwulan', '2026-T0')).toBeNull()
    expect(uraiPeriode('bulanan', '2026-13')).toBeNull()
    expect(uraiPeriode('bulanan', '2026-T1')).toBeNull()
    expect(uraiPeriode('tahunan', '26')).toBeNull()
    expect(uraiPeriode('bulanan', '2026-08')).toEqual({ musim: 'bulanan', kode: '2026-08' })
  })
  it('daftarPeriode terbaru dulu, termasuk yang berjalan', () => {
    expect(daftarPeriode('tahunan', '2024-01', HARI_INI).map((p) => p.kode)).toEqual(['2026', '2025', '2024'])
    const bulanan = daftarPeriode('bulanan', '2024-01', HARI_INI)
    expect(bulanan[0].kode).toBe('2026-09')
    expect(bulanan.at(-1)?.kode).toBe('2024-01')
    expect(bulanan).toHaveLength(33)
    expect(daftarPeriode('triwulan', '2024-01', HARI_INI).map((p) => p.kode).slice(0, 2)).toEqual(['2026-T3', '2026-T2'])
  })
})
