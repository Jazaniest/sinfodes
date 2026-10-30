import { describe, expect, it } from 'vitest'
import {
  BATAS_VERIFIKASI, hitungBerlaku, kodeSah, PESAN_KODE_FORMAT, PESAN_KODE_TIDAK_DITEMUKAN, PESAN_VERIFIKASI_TERKUNCI, rapikanKode,
  samarkanNama, teksBerlaku,
} from './verifikasi'

describe('verifikasi surat: aturan (SPEC §7.6)', () => {
  it('nama disamarkan: huruf pertama setiap kata, huruf lainnya bintang', () => {
    expect(samarkanNama('Siti Rahmah')).toBe('S*** R*****')
    expect(samarkanNama('  Muhammad   Alif ')).toBe('M******* A***')
    expect(samarkanNama('H. Muhammad Nasir')).toBe('H. M******* N****')
  })
  it('kode dirapikan: huruf kecil, spasi, tanda pisah panjang, atau tanpa pemisah (fokus review 1)', () => {
    expect(rapikanKode(' ss 7k3m q9td ')).toBe('SS-7K3M-Q9TD')
    expect(rapikanKode('SS-7K3M-Q9TD')).toBe('SS-7K3M-Q9TD')
    expect(rapikanKode('ss7k3mq9td')).toBe('SS-7K3M-Q9TD')
    expect(kodeSah(rapikanKode('ss 7k3m q9td'))).toBe(true)
    expect(kodeSah(rapikanKode('halo'))).toBe(false)
    expect(kodeSah(rapikanKode('SS-7K3M-Q9T0'))).toBe(false)
  })
  it('masa berlaku: berlaku, kedaluwarsa sesudah tanggal berlaku, atau dibatalkan (fokus review 2)', () => {
    const dasar = { status: 'selesai', pembatalan: null, berlakuSampai: '2026-12-24' }
    expect(hitungBerlaku(dasar, '2026-09-24')).toEqual({ status: 'berlaku', sampai: '2026-12-24' })
    expect(hitungBerlaku(dasar, '2026-12-24')).toEqual({ status: 'berlaku', sampai: '2026-12-24' })
    expect(hitungBerlaku(dasar, '2026-12-25')).toEqual({ status: 'kedaluwarsa', sampai: '2026-12-24' })
    expect(hitungBerlaku({ ...dasar, berlakuSampai: null }, '2030-01-01')).toEqual({ status: 'berlaku', sampai: null })
    expect(
      hitungBerlaku({ ...dasar, status: 'dibatalkan', pembatalan: { pada: '2026-10-03T09:00:00+07:00' } }, '2026-09-24'),
    ).toEqual({ status: 'dibatalkan', pada: '2026-10-03T09:00:00+07:00' })
  })
  it('teks masa berlaku untuk layar', () => {
    expect(teksBerlaku({ status: 'berlaku', sampai: '2026-12-24' })).toBe('Berlaku sampai 24 Des 2026')
    expect(teksBerlaku({ status: 'berlaku', sampai: null })).toBe('Berlaku')
    expect(teksBerlaku({ status: 'kedaluwarsa', sampai: '2026-09-01' })).toBe('Kedaluwarsa (berlaku sampai 1 Sep 2026)')
    expect(teksBerlaku({ status: 'dibatalkan', pada: '2026-10-03T09:00:00+07:00' })).toBe('Dibatalkan pada 3 Okt 2026')
  })
})

describe('pengaman verifikasi (SPEC-V0.2 §3.4, Ruling 12 tahap 8F2b)', () => {
  it('sepuluh kode salah dalam sepuluh menit mengunci sepuluh menit', () => {
    expect(BATAS_VERIFIKASI).toEqual({ gagal: 10, jendelaMs: 600_000, kunciMs: 600_000 })
  })
  it('pesan dipertahankan persis dari tiruan', () => {
    expect(PESAN_VERIFIKASI_TERKUNCI).toBe('Terlalu banyak percobaan. Coba lagi dalam 10 menit.')
    expect(PESAN_KODE_FORMAT).toBe('Kode verifikasi berbentuk seperti SS-7K3M-Q9TD.')
    expect(PESAN_KODE_TIDAK_DITEMUKAN).toBe('Kode tidak ditemukan. Periksa kembali, atau hubungi kantor desa.')
  })
})
