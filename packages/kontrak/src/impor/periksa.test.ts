import { describe, expect, it } from 'vitest'
import { buatNik } from '../penduduk/nik'
import type { Dusun } from '../wilayah/schema'
import { cocokkanKolom } from './kolom'
import { bacaTanggal, bacaWilayah, cocokEnum, kalimatPeriksa, periksaImpor, type KonteksImpor } from './periksa'
import type { LaporanImpor } from './schema'

const DUSUN: Dusun[] = [
  {
    id: 'dsn_ss_3', desaId: 'd', nomor: 3, nama: 'Teluk Rengas', kepalaDusun: 'R', posyandu: 'K',
    rw: [{ nomor: '005', ketua: 'K', rt: [{ nomor: '012', ketua: 'M' }] }],
  },
]
const ctx: KonteksImpor = { hariIni: new Date('2026-09-24T02:00:00Z'), dusun: DUSUN, istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' } }
const KOLOM = ['NIK', 'Nama', 'L/P', 'Tempat Lahir', 'Tgl. Lahir', 'Agama', 'SHDK', 'No. KK', 'Dusun', 'RW', 'RT']
const PEMETAAN = KOLOM.map(cocokkanKolom)
const NIK_RAHMAT = buatNik({ kodeWilayah: '140509', tanggalLahir: '1986-02-14', jenisKelamin: 'L', nomorUrut: 9971 })
const NIK_NUR = buatNik({ kodeWilayah: '140509', tanggalLahir: '1989-07-03', jenisKelamin: 'P', nomorUrut: 9972 })
const KK = '1405091506249971'

const sel = (nik: string, nama: string, jk: string, tanggal: string, shdk: string) =>
  [nik, nama, jk, 'Teluk Meranti', tanggal, 'Islam', shdk, KK, 'III', '005', '12']

function laporan(baris: string[][], ubah: Partial<LaporanImpor> = {}): LaporanImpor {
  return {
    id: 'imp_1', namaBerkas: 'uji.xlsx', dibuatPada: '2026-09-24T08:00:00+07:00',
    kolom: KOLOM.map((judul, i) => ({ judul, field: PEMETAAN[i] })),
    baris: baris.map((s, i) => ({ nomor: i + 2, sel: s })),
    nikTerdaftar: [], nomorKkTerdaftar: [], ...ubah,
  }
}
const TANPA_PILIHAN = { pemetaan: PEMETAAN, perbaikan: {}, lewati: [] }

describe('periksa impor (SPEC §6.8, fokus review 3)', () => {
  it('baris lengkap → siap, dengan biodata dan wilayah terbaca', () => {
    const h = periksaImpor(laporan([sel(NIK_RAHMAT, 'Rahmat Hidayat', 'L', '14/02/1986', 'Kepala Keluarga')]), TANPA_PILIHAN, ctx)
    expect(h).toMatchObject({ siap: 1, bermasalah: 0, dilewati: 0 })
    expect(h.baris[0].siap).toMatchObject({
      nomorKk: KK,
      wilayah: { dusunId: 'dsn_ss_3', rw: '005', rt: '012' },
      biodata: { nik: NIK_RAHMAT, tanggalLahir: '1986-02-14', hubunganKeluarga: 'Kepala Keluarga', ktpEl: 'Sudah rekam', golonganDarah: 'Tidak Tahu' },
    })
  })
  it('NIK salah format, terdaftar, dan ganda di berkas; tanggal mustahil; hubungan tak dikenal', () => {
    const h = periksaImpor(
      laporan(
        [
          sel(NIK_RAHMAT, 'Rahmat Hidayat', 'L', '14/02/1986', 'Kepala Keluarga'),
          sel(NIK_NUR.slice(0, 15), 'Nurhasanah', 'P', '03/07/1989', 'Istri'),
          sel('1405095203918002', 'Siti Rahmah', 'P', '12/03/1991', 'Famili Lain'),
          sel(NIK_RAHMAT, 'Rahmat Kembar', 'L', '14/02/1986', 'Anak'),
          sel(NIK_NUR, 'Nurhasanah', 'P', '31/02/1989', 'Ponakan'),
        ],
        { nikTerdaftar: ['1405095203918002'] },
      ),
      TANPA_PILIHAN,
      ctx,
    )
    expect(h.baris.map((b) => b.masalah.map((m) => m.jenis))).toEqual([
      [], ['nik-format'], ['nik-ganda-data'], ['nik-ganda-berkas'], ['tanggal-tidak-valid', 'hubungan-tidak-valid'],
    ])
    expect(kalimatPeriksa(h)).toBe(
      '1 siap · 4 bermasalah (1 NIK tidak valid, 1 NIK ganda di berkas, 1 NIK sudah terdaftar, 1 tanggal tidak valid, 1 hubungan keluarga tidak valid)',
    )
  })
  it('baris dilewati tidak diperiksa; perbaikan menimpa isi sel', () => {
    const lap = laporan([
      sel(NIK_RAHMAT, 'Rahmat Hidayat', 'L', '14/02/1986', 'Kepala Keluarga'),
      sel(NIK_NUR, 'Nurhasanah', 'P', '31/02/1989', 'Istri'),
    ])
    expect(periksaImpor(lap, { ...TANPA_PILIHAN, lewati: [3] }, ctx)).toMatchObject({ siap: 1, bermasalah: 0, dilewati: 1 })
    expect(kalimatPeriksa(periksaImpor(lap, { ...TANPA_PILIHAN, lewati: [3] }, ctx))).toBe('1 siap · 1 dilewati')
    expect(periksaImpor(lap, { ...TANPA_PILIHAN, perbaikan: { '3': { tanggalLahir: '03/07/1989' } } }, ctx)).toMatchObject({
      siap: 2, bermasalah: 0,
    })
  })
  it('KK tanpa kepala keluarga setelah kepalanya dilewati: anggotanya bermasalah', () => {
    const lap = laporan([
      sel(NIK_RAHMAT, 'Rahmat Hidayat', 'L', '14/02/1986', 'Kepala Keluarga'),
      sel(NIK_NUR, 'Nurhasanah', 'P', '03/07/1989', 'Istri'),
    ])
    const h = periksaImpor(lap, { ...TANPA_PILIHAN, lewati: [2] }, ctx)
    expect(h.baris[1].masalah).toEqual([
      { jenis: 'kk-kepala', field: 'hubunganKeluarga', pesan: 'KK 140509 150624 9971 belum punya kepala keluarga' },
    ])
    expect(h.siap).toBe(0)
  })
  it('peringatan bila tanggal lahir berbeda dengan NIK, tetap siap', () => {
    const h = periksaImpor(laporan([sel(NIK_RAHMAT, 'Rahmat Hidayat', 'L', '15/02/1986', 'Kepala Keluarga')]), TANPA_PILIHAN, ctx)
    expect(h.siap).toBe(1)
    expect(h.baris[0].peringatan).toEqual(['Tanggal lahir berbeda dengan NIK (14 Feb 1986)'])
  })
  it('tanggal, pilihan, dan wilayah dibaca longgar', () => {
    expect(bacaTanggal('1-3-1991')).toBe('1991-03-01')
    expect(bacaTanggal('1991-03-12')).toBe('1991-03-12')
    expect(bacaTanggal('31/02/1990')).toBeNull()
    expect(cocokEnum(['SLTA/Sederajat'], 'slta / sederajat')).toBe('SLTA/Sederajat')
    expect(bacaWilayah({ dusun: 'Dusun III', rw: '5', rt: '012' }, DUSUN, ctx.istilah)).toEqual({ dusunId: 'dsn_ss_3', rw: '005', rt: '012' })
    expect(bacaWilayah({ dusun: 'Teluk Rengas', rw: '005', rt: '099' }, DUSUN, ctx.istilah)).toBeNull()
  })
})
