import { describe, expect, it } from 'vitest'
import { buatNomorKk, periksaNomorKk } from './nomor-kk'

const HARI_INI = new Date('2026-09-24T02:30:00Z')

describe('nomor KK', () => {
  it('valid: wilayah, tanggal terbit, nomor urut', () =>
    expect(periksaNomorKk('1405091803198004', HARI_INI)).toEqual({
      status: 'valid',
      digit: '1405091803198004',
      kodeWilayah: '140509',
      tanggalTerbit: '2019-03-18',
      nomorUrut: '8004',
    }))
  it('belum lengkap', () =>
    expect(periksaNomorKk('14050918', HARI_INI)).toEqual({
      status: 'tidak-lengkap',
      pesan: 'Nomor KK harus 16 angka — baru 8',
    }))
  it('tanggal terbit tidak valid', () =>
    expect(periksaNomorKk('1405093202198004', HARI_INI)).toEqual({
      status: 'tidak-valid',
      pesan: 'Tanggal terbit di nomor KK tidak valid',
    }))
  it('buatNomorKk kebalikan dari periksaNomorKk', () =>
    expect(buatNomorKk({ kodeWilayah: '140509', tanggalTerbit: '2019-03-18', nomorUrut: 8004 })).toBe(
      '1405091803198004',
    ))
})
