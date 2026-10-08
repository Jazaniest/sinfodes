import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bacaDraf, hapusSemuaDraf, useDrafFormulir } from './useDrafFormulir'

type Isi = { nama: string }
const cocok = (x: unknown): x is Isi =>
  typeof x === 'object' && x !== null && typeof (x as { nama?: unknown }).nama === 'string'
const KUNCI = 'sinfodes.draf.uji'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('draf formulir (SPEC §6.4)', () => {
  it('disimpan setelah jeda 500 ms dan terbaca saat formulir dibuka lagi', () => {
    const pertama = renderHook(() => useDrafFormulir('uji', cocok))
    expect(pertama.result.current.draf).toBeNull()
    act(() => pertama.result.current.simpan({ nama: 'Fajar' }))
    expect(localStorage.getItem(KUNCI)).toBeNull()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    pertama.unmount()
    const kedua = renderHook(() => useDrafFormulir('uji', cocok))
    expect(kedua.result.current.draf?.isi).toEqual({ nama: 'Fajar' })
  })
  it('menutup formulir sebelum jeda habis tetap menyimpan isian terakhir', () => {
    const { result, unmount } = renderHook(() => useDrafFormulir('uji', cocok))
    act(() => result.current.simpan({ nama: 'Fajar R' }))
    unmount()
    expect(bacaDraf('uji', cocok)?.isi).toEqual({ nama: 'Fajar R' })
  })
  it('buang menghapus draf dan membatalkan simpanan yang tertunda', () => {
    const { result } = renderHook(() => useDrafFormulir('uji', cocok))
    act(() => result.current.simpan({ nama: 'Fajar' }))
    act(() => result.current.buang())
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(localStorage.getItem(KUNCI)).toBeNull()
  })
  it('draf rusak atau berbentuk lain diabaikan (fokus review 5)', () => {
    localStorage.setItem(KUNCI, '{bukan json')
    expect(bacaDraf('uji', cocok)).toBeNull()
    localStorage.setItem(KUNCI, JSON.stringify({ versi: 1, disimpanPada: '2026-09-24T09:00:00+07:00', isi: { nama: 42 } }))
    expect(bacaDraf('uji', cocok)).toBeNull()
    localStorage.setItem(KUNCI, JSON.stringify({ versi: 9, disimpanPada: '2026-09-24T09:00:00+07:00', isi: { nama: 'a' } }))
    expect(bacaDraf('uji', cocok)).toBeNull()
  })
  it('hapusSemuaDraf (saat keluar) hanya menghapus draf', () => {
    localStorage.setItem('sinfodes.draf.penduduk.tambah.umum.pgn_rosmiati', 'x')
    localStorage.setItem('sinfodes.demo.toolbar', 'terbuka')
    hapusSemuaDraf()
    expect(localStorage.getItem('sinfodes.draf.penduduk.tambah.umum.pgn_rosmiati')).toBeNull()
    expect(localStorage.getItem('sinfodes.demo.toolbar')).toBe('terbuka')
  })
})
