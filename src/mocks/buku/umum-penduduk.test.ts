import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { formatTanggal } from '@/domain/format/tanggal'
import { KOLOM_BUKU_INDUK } from '@/domain/penduduk/buku-induk'
import { bangkitkanDb } from '../generator'
import { bukuIndukPenduduk, bukuKtpKk, bukuMutasi, bukuPendudukSementara, bukuRekapitulasi } from './penduduk'
import { bukuAgenda, bukuAparat, bukuInventaris, bukuTanahKas } from './umum'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))
const DESA = 'desa_sungai_sialang'
const hidup = db.penduduk.filter((p) => p.desaId === DESA && p.statusDasar === 'Hidup')

// Rekapitulasi menghitung mutasi bulan berjalan: bekukan "sekarang" di tanggal yang sama dengan uji Beranda.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-24T02:00:00Z'))
})
afterAll(() => {
  vi.useRealTimers()
})

describe('buku administrasi umum (SPEC Lampiran B)', () => {
  it('Inventaris dan Kekayaan Desa: 40 aset urut kode, nilai rupiah tanpa singkatan', () => {
    const isi = bukuInventaris(db, DESA)
    expect(isi.baris).toHaveLength(40)
    expect(isi.baris[0]).toEqual(['1', '01.01.001', 'Tanah kas desa (kebun sawit)', 'Tanah', 'Hibah', '2009', '375.000.000', 'Baik', '2,5 ha · Dusun IV'])
    expect(isi.baris.every((b) => b.length === isi.kolom.length)).toBe(true)
  })
  it('Tanah Kas Desa: dua bidang tanah; Aparat: 14 perangkat dengan wilayah tugas kepala dusun', () => {
    expect(bukuTanahKas(db, DESA).baris.map((b) => b[2])).toEqual(['Tanah kas desa (kebun sawit)', 'Tanah kantor desa'])
    const aparat = bukuAparat(db, DESA)
    expect(aparat.baris).toHaveLength(14)
    expect(aparat.baris[0].slice(1, 4)).toEqual(['H. Muhammad Nasir', 'Kepala Desa', '2021–2029'])
    expect(aparat.baris.find((b) => b[2] === 'Kepala Dusun II')?.[4]).toBe('Dusun II Sialang Jaya')
  })
  it('Agenda: surat keluar bernomor dan surat masuk, urut tanggal dicatat', () => {
    const isi = bukuAgenda(db, DESA)
    const keluar = db.permohonan.filter((p) => p.desaId === DESA && p.terbit !== null).length
    const masuk = db.suratMasuk.filter((s) => s.desaId === DESA).length
    expect(isi.baris).toHaveLength(keluar + masuk)
    expect(new Set(isi.baris.map((b) => b[2]))).toEqual(new Set(['Keluar', 'Masuk']))
    expect(isi.diperbarui).not.toBeNull()
  })
})

describe('buku administrasi penduduk (SPEC Lampiran B)', () => {
  it('Buku Induk Penduduk: kolom resmi; satu baris per penduduk hidup, kepala keluarga lebih dulu', () => {
    const isi = bukuIndukPenduduk(db, DESA)
    expect(isi.kolom).toEqual(KOLOM_BUKU_INDUK)
    expect(isi.baris).toHaveLength(hidup.length)
    expect(isi.baris.every((b) => b.length === KOLOM_BUKU_INDUK.length)).toBe(true)
    expect(isi.baris.slice(0, 3).map((b) => b[0])).toEqual(['1', '2', '3'])
    expect(isi.baris[0][12]).toBe('Kepala Keluarga')
  })
  it('Mutasi Penduduk Desa: satu baris per orang per kejadian, mulai dari yang terlama', () => {
    const isi = bukuMutasi(db, DESA)
    const mutasi = db.mutasi.filter((m) => m.desaId === DESA)
    expect(isi.baris).toHaveLength(mutasi.reduce((n, m) => n + m.pendudukIds.length, 0))
    const terlama = mutasi.map((m) => m.tanggal).sort()[0]
    expect(isi.baris[0][1]).toBe(formatTanggal(terlama))
  })
  it('Rekapitulasi: per dusun, lalu baris Jumlah yang sama dengan keadaan desa di Beranda', () => {
    const isi = bukuRekapitulasi(db, DESA)
    expect(isi.baris.map((b) => b[0])).toEqual([
      'Dusun I Kampung Tengah', 'Dusun II Sialang Jaya', 'Dusun III Teluk Rengas', 'Dusun IV Sungai Lamo', 'Jumlah',
    ])
    expect(isi.baris[4]).toEqual(['Jumlah', '1.431', '1.381', '2.812', '806', '3', '1', '2', '4'])
    const jiwa = isi.baris.slice(0, 4).reduce((n, b) => n + Number(b[3].replace('.', '')), 0)
    expect(jiwa).toBe(2812)
  })
  it('Penduduk Sementara dan KTP/KK', () => {
    expect(bukuPendudukSementara(db, DESA).baris).toHaveLength(hidup.filter((p) => p.statusPenduduk === 'Sementara').length)
    const ktp = bukuKtpKk(db, DESA)
    expect(ktp.baris).toHaveLength(hidup.length)
    expect(ktp.kolom).toContain('KTP-el')
  })
})
