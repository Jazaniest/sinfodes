import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { kunciWarga } from '@/api/warga'
import { hapusSesi, simpanSesi } from '@/app/sesi'
import { contohSesiWarga } from '@/test/sesi'
import { keluarWarga, pasangSesiWarga } from './masuk-warga'

afterEach(() => {
  hapusSesi()
  hapusSesi('warga')
})

describe('sesi warga di perangkat (fokus review 1)', () => {
  it('pasang: token warga tersimpan, cache warga lama dibuang, sesi admin dan cache admin tetap', () => {
    simpanSesi('demo.pgn_rosmiati')
    const qc = new QueryClient()
    qc.setQueryData(['warga', 'beranda'], { lama: true })
    qc.setQueryData(['surat', 'jumlah'], 7)
    pasangSesiWarga('warga.pdk_siti_rahmah', contohSesiWarga(), qc)
    expect(ambilTokenSesi('warga')).toBe('warga.pdk_siti_rahmah')
    expect(localStorage.getItem('sinfodes.sesi.warga')).toBe('warga.pdk_siti_rahmah')
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
    expect(qc.getQueryData(['warga', 'beranda'])).toBeUndefined()
    expect(qc.getQueryData(kunciWarga.sesi)).toEqual(contohSesiWarga())
    expect(qc.getQueryData(['surat', 'jumlah'])).toBe(7)
  })
  it('keluar: token dan cache warga hilang; sesi admin dan cache admin tetap', () => {
    simpanSesi('demo.pgn_rosmiati')
    const qc = new QueryClient()
    pasangSesiWarga('warga.pdk_siti_rahmah', contohSesiWarga(), qc)
    qc.setQueryData(['surat', 'jumlah'], 7)
    keluarWarga(qc)
    expect(ambilTokenSesi('warga')).toBeNull()
    expect(localStorage.getItem('sinfodes.sesi.warga')).toBeNull()
    expect(qc.getQueryData(kunciWarga.sesi)).toBeUndefined()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
    expect(qc.getQueryData(['surat', 'jumlah'])).toBe(7)
  })
  it('keluar menghapus draf warga; draf panel admin tetap (fokus review 4)', () => {
    const qc = new QueryClient()
    pasangSesiWarga('warga.pdk_siti_rahmah', contohSesiWarga(), qc)
    localStorage.setItem('sinfodes.draf.warga.ajukan.pdk_siti_rahmah', 'x')
    localStorage.setItem('sinfodes.draf.penduduk.tambah.umum.pgn_rosmiati', 'y')
    keluarWarga(qc)
    expect(localStorage.getItem('sinfodes.draf.warga.ajukan.pdk_siti_rahmah')).toBeNull()
    expect(localStorage.getItem('sinfodes.draf.penduduk.tambah.umum.pgn_rosmiati')).toBe('y')
  })
})
