import { describe, expect, it } from 'vitest'
import { ambilTokenSesi, aturTokenSesi } from '@/api/client'
import { hapusSesi, pulihkanSesi, simpanSesi } from './sesi'

describe('sesi lokal', () => {
  it('menyimpan, memulihkan, dan memasang token di pemanggil API', () => {
    simpanSesi('demo.pgn_rosmiati')
    expect(pulihkanSesi()).toBe('demo.pgn_rosmiati')
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
  })
  it('hapus sesi', () => {
    simpanSesi('demo.pgn_rosmiati')
    hapusSesi()
    expect(pulihkanSesi()).toBeNull()
    expect(ambilTokenSesi()).toBeNull()
  })
  it('sesi warga disimpan terpisah: masuk dan keluar warga tidak menyentuh sesi admin (fokus review 1)', () => {
    simpanSesi('demo.pgn_rosmiati')
    simpanSesi('warga.pdk_siti_rahmah', 'warga')
    aturTokenSesi(null)
    aturTokenSesi(null, 'warga')
    expect(pulihkanSesi()).toBe('demo.pgn_rosmiati')
    expect(ambilTokenSesi('warga')).toBe('warga.pdk_siti_rahmah')
    hapusSesi('warga')
    expect(ambilTokenSesi('warga')).toBeNull()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
    pulihkanSesi()
    expect(ambilTokenSesi('warga')).toBeNull()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
    hapusSesi()
  })
  it('sesi konsol disimpan terpisah: dipulihkan bersama, dan keluar konsol tidak menyentuh sesi admin (fokus review 2)', () => {
    simpanSesi('demo.pgn_rosmiati')
    simpanSesi('konsol.kns_dina', 'konsol')
    aturTokenSesi(null)
    aturTokenSesi(null, 'konsol')
    expect(pulihkanSesi()).toBe('demo.pgn_rosmiati')
    expect(ambilTokenSesi('konsol')).toBe('konsol.kns_dina')
    expect(localStorage.getItem('sinfodes.sesi.konsol')).toBe('konsol.kns_dina')
    hapusSesi('konsol')
    expect(ambilTokenSesi('konsol')).toBeNull()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
    hapusSesi()
  })
  it('sesi kabupaten disimpan terpisah dan ikut dipulihkan (SPEC-V0.2 §8.1)', () => {
    simpanSesi('kab.kab_fajar', 'kabupaten')
    aturTokenSesi(null, 'kabupaten')
    pulihkanSesi()
    expect(ambilTokenSesi('kabupaten')).toBe('kab.kab_fajar')
    expect(localStorage.getItem('sinfodes.sesi.kabupaten')).toBe('kab.kab_fajar')
    hapusSesi('kabupaten')
    expect(ambilTokenSesi('kabupaten')).toBeNull()
  })
})
