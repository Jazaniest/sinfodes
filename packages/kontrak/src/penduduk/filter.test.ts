import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '../uji/contoh'
import { dataBelumLengkap, filterPendudukSchema, saringPenduduk, urutkanPenduduk, type KonteksSaring } from './filter'
import type { Penduduk } from './schema'

const HARI_INI = new Date('2026-09-24T02:30:00Z')
const ctx: KonteksSaring = {
  hariIni: HARI_INI,
  dusunIdPerNomor: new Map([
    [1, 'dsn_ss_1'],
    [2, 'dsn_ss_2'],
  ]),
  idPendatangTahunIni: new Set(['pdk_datang']),
}
const semua: Penduduk[] = [
  contohPenduduk({ id: 'pdk_siti' }),
  contohPenduduk({
    id: 'pdk_bayi', nama: 'Muhammad Alif', jenisKelamin: 'L', tanggalLahir: '2023-11-02', hubunganKeluarga: 'Anak',
    statusPerkawinan: 'Belum Kawin', ktpEl: 'Belum wajib', pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Belum/Tidak Bekerja',
  }),
  contohPenduduk({
    id: 'pdk_lansia', nama: 'Wan Salmah', tanggalLahir: '1950-05-01', dusunId: 'dsn_ss_2', rw: '003', rt: '006',
    statusPerkawinan: 'Cerai Mati',
  }),
  contohPenduduk({
    id: 'pdk_ktp', nama: 'Rizky Pratama', jenisKelamin: 'L', tanggalLahir: '2008-01-20', statusPerkawinan: 'Belum Kawin',
    ktpEl: 'Belum rekam', hubunganKeluarga: 'Anak',
  }),
  contohPenduduk({
    id: 'pdk_datang', nama: 'Hendra Simanjuntak', jenisKelamin: 'L', tanggalLahir: '1979-11-25', agama: 'Kristen',
    diubahPada: '2026-09-20T08:00:00+07:00',
  }),
  contohPenduduk({ id: 'pdk_kurang', nama: 'Amran', jenisKelamin: 'L', pekerjaan: null }),
  contohPenduduk({ id: 'pdk_meninggal', nama: 'Ismail', statusDasar: 'Meninggal' }),
]
const f = (x: Record<string, unknown>) => filterPendudukSchema.parse(x)
const ids = (xs: Penduduk[]) => xs.map((p) => p.id)

describe('filterPendudukSchema', () => {
  it('nilai bawaan', () => expect(f({})).toEqual({ status: 'Hidup', urut: 'nama', page: 1, pageSize: 25 }))
  it('mengubah teks dari URL menjadi angka', () =>
    expect(f({ dusun: '2', umurMin: '60', page: '2', pageSize: '50' })).toMatchObject({
      dusun: 2, umurMin: 60, page: 2, pageSize: 50,
    }))
  it('ukuran halaman hanya 25, 50, atau 100', () =>
    expect(filterPendudukSchema.safeParse({ pageSize: '30' }).success).toBe(false))
})

describe('saringPenduduk', () => {
  it('bawaan hanya penduduk hidup', () => expect(ids(saringPenduduk(semua, f({}), ctx))).not.toContain('pdk_meninggal'))
  it('status meninggal', () => expect(ids(saringPenduduk(semua, f({ status: 'Meninggal' }), ctx))).toEqual(['pdk_meninggal']))
  it('dusun', () => expect(ids(saringPenduduk(semua, f({ dusun: 2 }), ctx))).toEqual(['pdk_lansia']))
  it('jenis kelamin dan umur minimal', () =>
    expect(ids(saringPenduduk(semua, f({ jk: 'L', umurMin: 18 }), ctx))).toEqual(['pdk_ktp', 'pdk_datang', 'pdk_kurang']))
  it('agama', () => expect(ids(saringPenduduk(semua, f({ agama: 'Kristen' }), ctx))).toEqual(['pdk_datang']))
  it.each([
    ['balita', ['pdk_bayi']],
    ['lansia', ['pdk_lansia']],
    ['wajib-ktp-belum-rekam', ['pdk_ktp']],
    ['pendatang-tahun-ini', ['pdk_datang']],
    ['data-belum-lengkap', ['pdk_kurang']],
  ] as const)('preset %s', (preset, harap) => expect(ids(saringPenduduk(semua, f({ preset }), ctx))).toEqual(harap))
})

describe('dataBelumLengkap', () => {
  it('bayi di bawah 3 bulan tanpa NIK masih wajar', () =>
    expect(dataBelumLengkap(contohPenduduk({ nik: null, tanggalLahir: '2026-08-20' }), HARI_INI)).toBe(false))
  it('anak 1 tahun tanpa NIK dianggap belum lengkap', () =>
    expect(dataBelumLengkap(contohPenduduk({ nik: null, tanggalLahir: '2025-09-01' }), HARI_INI)).toBe(true))
})

describe('urutkanPenduduk', () => {
  const hidup = saringPenduduk(semua, f({}), ctx)
  const nomorDusun = (id: string) => (id === 'dsn_ss_2' ? 2 : 1)
  it('nama A-Z', () =>
    expect(ids(urutkanPenduduk(hidup, 'nama', { nomorDusun }))).toEqual([
      'pdk_kurang', 'pdk_datang', 'pdk_bayi', 'pdk_ktp', 'pdk_siti', 'pdk_lansia',
    ]))
  it('umur termuda dulu', () => expect(ids(urutkanPenduduk(hidup, 'umur', { nomorDusun }))[0]).toBe('pdk_bayi'))
  it('dusun', () => expect(ids(urutkanPenduduk(hidup, 'dusun', { nomorDusun })).at(-1)).toBe('pdk_lansia'))
  it('terakhir diubah dulu', () => expect(ids(urutkanPenduduk(hidup, 'diubah', { nomorDusun }))[0]).toBe('pdk_datang'))
})

describe('filter KTP-el (2A-3, dari grafik Statistik)', () => {
  it('hanya penduduk dengan status KTP-el itu', () => {
    const daftar = [contohPenduduk({ id: 'a', ktpEl: 'Belum rekam' }), contohPenduduk({ id: 'b' })]
    expect(saringPenduduk(daftar, filterPendudukSchema.parse({ ktpEl: 'Belum rekam' }), ctx).map((p) => p.id)).toEqual(['a'])
  })
  it('nilai asing ditolak skema', () => expect(filterPendudukSchema.safeParse({ ktpEl: 'Hilang' }).success).toBe(false))
})
