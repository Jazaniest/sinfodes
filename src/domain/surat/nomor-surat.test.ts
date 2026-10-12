import { describe, expect, it } from 'vitest'
import { bulanRomawi, FORMAT_NOMOR_BAWAAN, formatNomorSurat, urutBerikutnya, type NomorTerpakai } from './nomor-surat'

describe('bulanRomawi', () => {
  it('September → IX, Desember → XII', () => {
    expect(bulanRomawi(9)).toBe('IX')
    expect(bulanRomawi(12)).toBe('XII')
  })
  it('menolak bulan di luar 1–12', () => expect(() => bulanRomawi(13)).toThrow('Bulan tidak valid'))
})

describe('formatNomorSurat', () => {
  const nilai = { klasifikasi: '400', kodeJenis: 'SKTM', urut: 87, kodeDesa: 'SS', tanggal: '2026-09-24' }
  it('format bawaan SPEC §7.2', () => expect(formatNomorSurat(FORMAT_NOMOR_BAWAAN, nilai)).toBe('400/087/SS/IX/2026'))
  it('nomor urut di atas 999 tidak dipotong', () =>
    expect(formatNomorSurat(FORMAT_NOMOR_BAWAAN, { ...nilai, klasifikasi: '470', urut: 1004, tanggal: '2026-12-01' })).toBe(
      '470/1004/SS/XII/2026',
    ))
  it('kode jenis surat, untuk urutan per jenis', () =>
    expect(formatNomorSurat('{kodeJenis}/{urut}/{tahun}', { ...nilai, urut: 5, tanggal: '2026-01-02' })).toBe('SKTM/005/2026'))
  it('potongan yang tidak dikenal dibiarkan', () =>
    expect(formatNomorSurat('{x}/{urut}', { ...nilai, urut: 5, tanggal: '2026-01-02' })).toBe('{x}/005'))
})

describe('urutBerikutnya', () => {
  const terpakai: NomorTerpakai[] = [
    { tahun: 2026, urut: 86, jenisKode: 'SKD' },
    { tahun: 2026, urut: 87, jenisKode: 'SKTM' },
    { tahun: 2026, urut: 88, jenisKode: 'SKU' }, // dibatalkan, tetap dihitung
    { tahun: 2025, urut: 912, jenisKode: 'SKD' },
  ]
  it('mulai dari 1', () => expect(urutBerikutnya([], { tahun: 2026, jenisKode: 'SKD', mode: 'per-tahun' })).toBe(1))
  it('satu urutan per tahun; nomor batal tidak dipakai ulang', () =>
    expect(urutBerikutnya(terpakai, { tahun: 2026, jenisKode: 'SKD', mode: 'per-tahun' })).toBe(89))
  it('mulai ulang di tahun baru', () =>
    expect(urutBerikutnya(terpakai, { tahun: 2027, jenisKode: 'SKD', mode: 'per-tahun' })).toBe(1))
  it('urutan per jenis surat', () => {
    expect(urutBerikutnya(terpakai, { tahun: 2026, jenisKode: 'SKTM', mode: 'per-jenis' })).toBe(88)
    expect(urutBerikutnya(terpakai, { tahun: 2026, jenisKode: 'SPN', mode: 'per-jenis' })).toBe(1)
  })
})
