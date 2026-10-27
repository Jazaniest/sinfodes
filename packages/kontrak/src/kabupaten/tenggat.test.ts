import { describe, expect, it } from 'vitest'
import { ambangTercapai, isianTenggatSchema, kalimatSisa, sisaHari, statusKirim } from './tenggat'

describe('status kirim laporan (SPEC-V0.2 §8.3 butir 4: kabupaten melihat status per desa)', () => {
  it('belum, lewat, terlambat, dan dikirim', () => {
    expect(statusKirim('2026-09-30', null, '2026-09-30')).toBe('belum')
    expect(statusKirim('2026-09-30', null, '2026-10-01')).toBe('lewat')
    expect(statusKirim('2026-09-30', '2026-10-02', '2026-10-05')).toBe('terlambat')
    expect(statusKirim('2026-09-30', '2026-09-30', '2026-10-05')).toBe('dikirim')
  })
})

describe('sisa hari sampai tenggat (fokus review 4)', () => {
  it('dihitung per tanggal kalender WIB', () => {
    expect(sisaHari('2026-09-30', '2026-09-24')).toBe(6)
    expect(sisaHari('2026-09-30', '2026-10-01')).toBe(-1)
    expect(sisaHari('2027-01-15', '2026-09-24')).toBe(113)
  })
  it('kalimat: hari ini, besok, n hari lagi, lewat n hari', () => {
    expect(kalimatSisa(0)).toBe('hari ini')
    expect(kalimatSisa(1)).toBe('besok')
    expect(kalimatSisa(6)).toBe('6 hari lagi')
    expect(kalimatSisa(-1)).toBe('lewat 1 hari')
  })
})

describe('isian tenggat', () => {
  it('nama dipangkas; kosong dan lebih dari 120 karakter ditolak', () => {
    expect(isianTenggatSchema.parse({ nama: '  Laporan DD  ', tanggal: '2026-10-10' }).nama).toBe('Laporan DD')
    expect(isianTenggatSchema.safeParse({ nama: '   ', tanggal: '2026-10-10' }).success).toBe(false)
    expect(isianTenggatSchema.safeParse({ nama: 'a'.repeat(121), tanggal: '2026-10-10' }).success).toBe(false)
    expect(isianTenggatSchema.safeParse({ nama: 'a'.repeat(120), tanggal: '2026-10-10' }).success).toBe(true)
    expect(isianTenggatSchema.safeParse({ nama: 'Laporan', tanggal: '10/10/2026' }).success).toBe(false)
  })
})

describe('ambang pengingat H-14, H-7, H-1 (fokus review 4)', () => {
  const lama = { tanggal: '2026-09-30', dibuatPada: '2026-09-01T09:00:00+07:00' }
  it('ambang yang sudah tercapai pada hari itu', () => {
    expect(ambangTercapai(lama, '2026-09-15')).toEqual([])
    expect(ambangTercapai(lama, '2026-09-24')).toEqual([
      { ambang: 14, tanggal: '2026-09-16' },
      { ambang: 7, tanggal: '2026-09-23' },
    ])
    expect(ambangTercapai(lama, '2026-09-29').map((a) => a.ambang)).toEqual([14, 7, 1])
  })
  it('tenggat yang dibuat pada H-5: ambang 14 dan 7 jatuh di hari yang sama, jadi satu saja', () => {
    const baru = { tanggal: '2026-09-30', dibuatPada: '2026-09-25T13:00:00+07:00' }
    expect(ambangTercapai(baru, '2026-09-25')).toEqual([{ ambang: 7, tanggal: '2026-09-25' }])
    expect(ambangTercapai(baru, '2026-09-29')).toEqual([
      { ambang: 7, tanggal: '2026-09-25' },
      { ambang: 1, tanggal: '2026-09-29' },
    ])
  })
})
