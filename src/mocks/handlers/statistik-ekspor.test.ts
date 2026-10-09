import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { GalatApi } from '@/api/galat'
import { daftarPenduduk, eksporPenduduk } from '@/api/penduduk'
import { ambilStatistikPenduduk } from '@/api/statistik'
import { formatAngka } from '@/domain/format/angka'
import { hitungUmur } from '@/domain/format/tanggal'
import { filterPendudukSchema } from '@/domain/penduduk/filter'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('GET /statistik/penduduk (SPEC §6.7)', () => {
  it('operator: angka sama dengan data seed; piramida dan per dusun menjumlah ke total', async () => {
    masukSebagai(AKUN_UJI.operator)
    const s = await ambilStatistikPenduduk(null)
    expect(s).toMatchObject({ dusun: null, jiwa: 2812, laki: 1431, perempuan: 1381, kk: 806 })
    expect(s.piramida.reduce((t, k) => t + k.laki + k.perempuan, 0)).toBe(2812)
    expect(s.perDusun.map((b) => b.label)).toEqual([
      'Dusun I Kampung Tengah', 'Dusun II Sialang Jaya', 'Dusun III Teluk Rengas', 'Dusun IV Sungai Lamo',
    ])
    expect(s.perDusun.reduce((t, b) => t + b.jumlah, 0)).toBe(2812)
    expect(s.pekerjaan.length).toBeLessThanOrEqual(12)
  })
  it('satu dusun: jiwa sama dengan daftar penduduk dusun itu; tanpa grafik per dusun', async () => {
    masukSebagai(AKUN_UJI.operator)
    const s = await ambilStatistikPenduduk(3)
    expect(s.dusun).toBe(3)
    expect(s.jiwa).toBe((await daftarPenduduk({ dusun: 3 })).meta.total)
    expect(s.perDusun).toEqual([])
  })
  it('Kepala Dusun II selalu mendapat dusunnya, walau meminta dusun lain (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const s = await ambilStatistikPenduduk(1)
    expect(s.dusun).toBe(2)
    masukSebagai(AKUN_UJI.operator)
    expect(s.jiwa).toBe((await daftarPenduduk({ dusun: 2 })).meta.total)
  })
  it('Kaur Keuangan → FORBIDDEN; dusun tidak dikenal → VALIDATION', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(ambilStatistikPenduduk(null))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(ambilStatistikPenduduk(9))).kode).toBe('VALIDATION')
  })
})

describe('POST /penduduk/ekspor (SPEC §6.2)', () => {
  it('semua baris sesuai filter, tanpa halaman; dicatat di Buku hari ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { baris } = await eksporPenduduk({ kata: null, filter: filterPendudukSchema.parse({ preset: 'lansia' }), format: 'csv' })
    expect(baris.length).toBe((await daftarPenduduk({ preset: 'lansia' })).meta.total)
    expect(baris.length).toBeGreaterThan(25)
    expect(baris.every((p) => hitungUmur(p.tanggalLahir, SEKARANG_UJI).tahun >= 60)).toBe(true)
    expect((await ambilBeranda()).bukuHariIni).toContainEqual(
      expect.objectContaining({
        jenis: 'penduduk-ekspor', ringkasan: `Data penduduk diunduh (${formatAngka(baris.length)} baris)`, oleh: expect.objectContaining({ nama: 'Rosmiati' }),
      }),
    )
  })
  it('kata cari ikut terbawa; cetak dicatat sebagai Buku Induk', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { baris } = await eksporPenduduk({ kata: 'Syahrial', filter: filterPendudukSchema.parse({}), format: 'cetak' })
    expect(baris.map((p) => p.nama)).toContain('Syahrial')
    expect(baris.length).toBeLessThan(25)
    expect((await ambilBeranda()).bukuHariIni).toContainEqual(
      expect.objectContaining({ ringkasan: `Buku Induk Penduduk dicetak (${formatAngka(baris.length)} baris)` }),
    )
  })
  it('tanpa hasil → VALIDATION (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(eksporPenduduk({ kata: 'zzzz tidak ada', filter: filterPendudukSchema.parse({}), format: 'csv' }))
    expect(g.kode).toBe('VALIDATION')
  })
  it('Kepala Dusun hanya mendapat dusunnya; Kaur Keuangan ditolak (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const { baris } = await eksporPenduduk({ kata: null, filter: filterPendudukSchema.parse({}), format: 'csv' })
    expect(new Set(baris.map((p) => p.dusunId))).toEqual(new Set(['dsn_ss_2']))
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(eksporPenduduk({ kata: null, filter: filterPendudukSchema.parse({}), format: 'csv' }))).kode).toBe('FORBIDDEN')
  })
})
