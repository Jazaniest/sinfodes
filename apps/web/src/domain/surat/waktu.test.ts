import { describe, expect, it } from 'vitest'
import { berlakuSampai, hariKerjaBerlalu, lamaMenunggu } from './waktu'

// Kamis, 24 September 2026 pukul 09.00 WIB.
const SEKARANG = new Date('2026-09-24T02:00:00Z')

describe('hariKerjaBerlalu (SPEC §7.1, fokus review 5)', () => {
  it('hari masuk tidak dihitung', () => {
    expect(hariKerjaBerlalu('2026-09-21T09:00:00+07:00', '2026-09-21T15:00:00+07:00')).toBe(0)
    expect(hariKerjaBerlalu('2026-09-21T09:00:00+07:00', '2026-09-22T08:00:00+07:00')).toBe(1)
  })
  it('Sabtu dan Minggu dilewati', () => {
    expect(hariKerjaBerlalu('2026-09-25T16:00:00+07:00', '2026-09-28T08:00:00+07:00')).toBe(1)
    expect(hariKerjaBerlalu('2026-09-26T10:00:00+07:00', '2026-09-28T08:00:00+07:00')).toBe(1)
    expect(hariKerjaBerlalu('2026-09-24T10:00:00+07:00', '2026-09-29T10:00:00+07:00')).toBe(3)
  })
  it('pergantian hari mengikuti WIB, bukan UTC', () => {
    expect(hariKerjaBerlalu('2026-09-21T23:30:00+07:00', '2026-09-22T00:10:00+07:00')).toBe(1)
    // 21 Sep 18.00 UTC = Selasa 22 Sep 01.00 WIB.
    expect(hariKerjaBerlalu('2026-09-21T18:00:00Z', '2026-09-22T10:00:00+07:00')).toBe(0)
  })
})

describe('lamaMenunggu', () => {
  const terbuka = (masukPada: string) => lamaMenunggu({ masukPada, ditutupPada: null }, SEKARANG)
  it('permohonan terbuka: oker lewat 1 hari kerja, merah lewat 3', () => {
    expect(terbuka('2026-09-24T07:45:00+07:00')).toEqual({ hari: 0, teks: 'Hari ini', nada: 'biasa' })
    expect(terbuka('2026-09-23T10:00:00+07:00')).toEqual({ hari: 1, teks: '1 hari kerja', nada: 'biasa' })
    expect(terbuka('2026-09-21T09:00:00+07:00')).toEqual({ hari: 3, teks: '3 hari kerja', nada: 'oker' })
    expect(terbuka('2026-09-18T15:00:00+07:00')).toEqual({ hari: 4, teks: '4 hari kerja', nada: 'merah' })
  })
  it('permohonan yang sudah ditutup: lama prosesnya, tanpa warna', () => {
    expect(lamaMenunggu({ masukPada: '2026-09-21T09:00:00+07:00', ditutupPada: '2026-09-21T13:00:00+07:00' }, SEKARANG)).toEqual({
      hari: 0,
      teks: 'Hari yang sama',
      nada: 'biasa',
    })
    expect(lamaMenunggu({ masukPada: '2026-09-21T09:00:00+07:00', ditutupPada: '2026-09-28T10:00:00+07:00' }, SEKARANG)).toEqual({
      hari: 5,
      teks: '5 hari kerja',
      nada: 'biasa',
    })
  })
})

describe('berlakuSampai (SPEC §7.3, §7.6)', () => {
  it('tanggal surat + masa berlaku dalam bulan', () => {
    expect(berlakuSampai('2026-09-24', 3)).toBe('2026-12-24')
    expect(berlakuSampai('2026-09-24T10:00:00+07:00', 6)).toBe('2027-03-24')
  })
  it('tanggal yang tidak ada di bulan tujuan → akhir bulan itu (fokus review 5)', () => {
    expect(berlakuSampai('2026-11-30', 3)).toBe('2027-02-28')
    expect(berlakuSampai('2026-01-31', 1)).toBe('2026-02-28')
    expect(berlakuSampai('2028-01-31', 1)).toBe('2028-02-29')
  })
  it('tanggal surat dibaca menurut WIB', () => expect(berlakuSampai('2026-09-23T20:00:00Z', 3)).toBe('2026-12-24'))
  it('tanpa batas → null', () => expect(berlakuSampai('2026-09-24', null)).toBeNull())
})
