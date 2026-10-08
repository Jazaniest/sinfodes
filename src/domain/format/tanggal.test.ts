import { describe, expect, it } from 'vitest'
import {
  formatDiperbarui,
  formatJam,
  formatTanggal,
  formatUmur,
  formatWaktuRelatif,
  hitungUmur,
  tanggalIsoWib,
  waktuIsoWib,
} from './tanggal'

// Kamis, 24 September 2026 pukul 09.30 WIB
const SEKARANG = new Date('2026-09-24T02:30:00Z')

describe('formatTanggal', () => {
  it('gaya panjang untuk surat', () => expect(formatTanggal('2026-09-24')).toBe('24 September 2026'))
  it('gaya pendek untuk tabel', () => expect(formatTanggal('2026-08-05', 'pendek')).toBe('5 Agu 2026'))
  it('gaya hari untuk kepala halaman', () =>
    expect(formatTanggal('2026-09-24', 'hari')).toBe('Kamis, 24 September 2026'))
  it('tanggal-waktu UTC diubah ke kalender WIB', () =>
    expect(formatTanggal('2026-09-23T18:30:00Z')).toBe('24 September 2026'))
  it('menolak masukan tidak valid', () => expect(() => formatTanggal('bukan tanggal')).toThrow('Tanggal tidak valid'))
})

describe('formatJam', () => {
  it('memakai titik dan zona WIB', () => expect(formatJam('2026-09-24T02:12:00Z')).toBe('09.12'))
  it('menghormati offset +07:00', () => expect(formatJam('2026-09-24T09:05:00+07:00')).toBe('09.05'))
})

describe('formatWaktuRelatif', () => {
  it('hari ini → jam', () => expect(formatWaktuRelatif('2026-09-24T08:15:00+07:00', SEKARANG)).toBe('08.15'))
  it('kemarin → "Kemarin"', () =>
    expect(formatWaktuRelatif('2026-09-23T16:00:00+07:00', SEKARANG)).toBe('Kemarin'))
  it('lebih lama di tahun yang sama → tanggal dan bulan', () =>
    expect(formatWaktuRelatif('2026-09-21T10:00:00+07:00', SEKARANG)).toBe('21 Sep'))
  it('tahun lain → dengan tahun', () =>
    expect(formatWaktuRelatif('2025-12-30T10:00:00+07:00', SEKARANG)).toBe('30 Des 2025'))
})

describe('tanggal ISO menurut WIB', () => {
  it('tanggalIsoWib memakai kalender WIB', () =>
    expect(tanggalIsoWib(new Date('2026-09-23T18:00:00Z'))).toBe('2026-09-24'))
  it('waktuIsoWib menyertakan +07:00', () =>
    expect(waktuIsoWib(new Date('2026-09-24T02:12:00Z'))).toBe('2026-09-24T09:12:00+07:00'))
})

describe('umur', () => {
  it('menghitung tahun dan bulan penuh', () =>
    expect(hitungUmur('1991-03-12', SEKARANG)).toEqual({ tahun: 35, bulan: 426 }))
  it('belum berulang tahun di tahun berjalan', () => expect(hitungUmur('1984-10-17', SEKARANG).tahun).toBe(41))
  it('bayi ditulis dalam bulan', () => expect(formatUmur('2026-01-10', SEKARANG)).toBe('8 bulan'))
  it('bayi di bawah sebulan', () => expect(formatUmur('2026-09-10', SEKARANG)).toBe('kurang dari 1 bulan'))
  it('dewasa ditulis dalam tahun', () => expect(formatUmur('1991-03-12', SEKARANG)).toBe('35 tahun'))
})

describe('formatDiperbarui (meta kepala halaman)', () => {
  const sekarang = new Date('2026-09-24T02:00:00Z')
  it('hari ini → jam', () => expect(formatDiperbarui('2026-09-24T08:15:00+07:00', sekarang)).toBe('hari ini 08.15'))
  it('kemarin', () => expect(formatDiperbarui('2026-09-23T14:00:00+07:00', sekarang)).toBe('kemarin'))
  it('lebih lama → tanggal', () => expect(formatDiperbarui('2026-09-21T10:00:00+07:00', sekarang)).toBe('21 Sep'))
})
