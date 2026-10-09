import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { PEKERJAAN } from '../penduduk/enum'
import type { Dusun } from '../wilayah/schema'
import { barisCsvStatistik, filterBatang, filterKelompokUmur, hitungStatistik, type KonteksStatistik } from './penduduk'

const DUSUN: Dusun[] = [
  {
    id: 'dsn_1', desaId: 'd', nomor: 1, nama: 'Kampung Tengah', kepalaDusun: 'A', posyandu: 'M',
    rw: [{ nomor: '001', ketua: 'R', rt: [{ nomor: '001', ketua: 'J' }] }],
  },
  {
    id: 'dsn_2', desaId: 'd', nomor: 2, nama: 'Sialang Jaya', kepalaDusun: 'S', posyandu: 'M',
    rw: [{ nomor: '003', ketua: 'R', rt: [{ nomor: '006', ketua: 'J' }] }],
  },
]
const ctx: KonteksStatistik = {
  hariIni: new Date('2026-09-24T02:00:00Z'), dusun: DUSUN, istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' }, dusunTerpilih: null, kk: 2,
}
const PENDUDUK = [
  contohPenduduk({ id: 'a', jenisKelamin: 'L', tanggalLahir: '1990-01-01', dusunId: 'dsn_1' }),
  contohPenduduk({ id: 'b', jenisKelamin: 'P', tanggalLahir: '1992-05-05', dusunId: 'dsn_1', pekerjaan: null }),
  contohPenduduk({ id: 'c', jenisKelamin: 'L', tanggalLahir: '2024-02-02', dusunId: 'dsn_2', agama: 'Kristen', ktpEl: 'Belum wajib' }),
  contohPenduduk({ id: 'd', jenisKelamin: 'P', tanggalLahir: '1940-01-01', dusunId: 'dsn_2' }),
  contohPenduduk({ id: 'x', statusDasar: 'Meninggal' }),
]

describe('hitungStatistik (SPEC §6.7)', () => {
  const s = hitungStatistik(PENDUDUK, ctx)
  it('hanya yang hidup; jiwa, laki-laki, perempuan, KK', () =>
    expect(s).toMatchObject({ dusun: null, jiwa: 4, laki: 2, perempuan: 2, kk: 2 }))
  it('piramida 16 kelompok; 75+ tanpa batas atas', () => {
    expect(s.piramida).toHaveLength(16)
    expect(s.piramida.find((k) => k.label === '35–39')).toMatchObject({ laki: 1, perempuan: 0 })
    expect(s.piramida.find((k) => k.label === '30–34')).toMatchObject({ laki: 0, perempuan: 1 })
    expect(s.piramida.at(-1)).toEqual({ label: '75+', umurMin: 75, umurMax: null, laki: 0, perempuan: 1 })
  })
  it('per dusun; agama menurut urutan enum; nilai kosong jadi "Belum diisi"', () => {
    expect(s.perDusun).toEqual([
      { kunci: '1', label: 'Dusun I Kampung Tengah', jumlah: 2 },
      { kunci: '2', label: 'Dusun II Sialang Jaya', jumlah: 2 },
    ])
    expect(s.agama).toEqual([
      { kunci: 'Islam', label: 'Islam', jumlah: 3 },
      { kunci: 'Kristen', label: 'Kristen', jumlah: 1 },
    ])
    expect(s.pekerjaan.at(-1)).toEqual({ kunci: null, label: 'Belum diisi', jumlah: 1 })
  })
  it('satu dusun dipilih → tanpa grafik per dusun', () =>
    expect(hitungStatistik(PENDUDUK, { ...ctx, dusunTerpilih: 2 }).perDusun).toEqual([]))
  it('pekerjaan: 10 teratas, sisanya "Pekerjaan lain"', () => {
    const daftar = PEKERJAAN.slice(0, 12).flatMap((pk, i) =>
      Array.from({ length: 12 - i }, (_, n) => contohPenduduk({ id: `${i}-${n}`, pekerjaan: pk })),
    )
    const hasil = hitungStatistik(daftar, ctx).pekerjaan
    expect(hasil).toHaveLength(11)
    expect(hasil[0]).toEqual({ kunci: PEKERJAAN[0], label: PEKERJAAN[0], jumlah: 12 })
    expect(hasil[10]).toEqual({ kunci: null, label: 'Pekerjaan lain', jumlah: 3 })
  })
  it('tanpa penduduk: semua nol, tanpa batang', () => {
    const kosong = hitungStatistik([], { ...ctx, kk: 0 })
    expect(kosong).toMatchObject({ jiwa: 0, agama: [], pekerjaan: [], ktpEl: [] })
    expect(kosong.piramida.every((k) => k.laki + k.perempuan === 0)).toBe(true)
  })
})

describe('batang → filter daftar penduduk', () => {
  it('membawa dusun yang dipilih', () => {
    expect(filterBatang('agama', 'Islam', 2)).toEqual({ dusun: 2, agama: 'Islam' })
    expect(filterBatang('perkawinan', 'Cerai Mati', null)).toEqual({ kawin: 'Cerai Mati' })
    expect(filterBatang('perDusun', '3', null)).toEqual({ dusun: 3 })
    expect(filterBatang('ktpEl', 'Belum rekam', null)).toEqual({ ktpEl: 'Belum rekam' })
  })
  it('kelompok umur: 75+ tanpa umurMax', () => {
    expect(filterKelompokUmur({ umurMin: 60, umurMax: 64 }, 'L', 2)).toEqual({ dusun: 2, jk: 'L', umurMin: 60, umurMax: 64 })
    expect(filterKelompokUmur({ umurMin: 75, umurMax: null }, 'P', null)).toEqual({ jk: 'P', umurMin: 75 })
  })
})

describe('CSV statistik', () => {
  it('ringkasan, piramida, lalu tiap grafik sebagai tabel', () => {
    const baris = barisCsvStatistik(hitungStatistik(PENDUDUK, ctx), 'Desa Sungai Sialang')
    expect(baris.slice(0, 7)).toEqual([
      ['Statistik penduduk', 'Desa Sungai Sialang'], ['Jiwa', 4], ['Laki-laki', 2], ['Perempuan', 2], ['KK', 2], [],
      ['Kelompok umur', 'Laki-laki', 'Perempuan', 'Jumlah'],
    ])
    expect(baris).toContainEqual(['Agama', 'Jumlah'])
    expect(baris).toContainEqual(['Belum diisi', 1])
  })
})
