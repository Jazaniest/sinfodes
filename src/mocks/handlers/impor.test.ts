// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { GalatApi } from '@/api/galat'
import { konfirmasiImpor, unggahImpor } from '@/api/impor'
import { simpanWilayah } from '@/api/pengaturan'
import { ambilRingkasanPenduduk } from '@/api/penduduk'
import { ambilDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const BERMASALAH = [5, 8, 12, 13, 17]

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('POST /impor/penduduk (SPEC §6.8)', () => {
  it('berkas contoh: 16 kolom (2 tidak dikenali), 17 baris, NIK Siti Rahmah sudah terdaftar', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    expect(lap.namaBerkas).toBe('pendataan-rt-teluk-rengas.xlsx')
    expect(lap.kolom).toHaveLength(16)
    expect(lap.kolom.filter((k) => k.field === null).map((k) => k.judul)).toEqual(['Gol. Drh', 'Keterangan'])
    expect(lap.baris.map((b) => b.nomor)).toEqual(Array.from({ length: 17 }, (_, i) => i + 2))
    expect(lap.nikTerdaftar).toEqual(['1405095203918002'])
    expect(lap.nomorKkTerdaftar).toEqual([])
  })
  it('berkas sungguhan lewat multipart: nama berkasnya dipakai; jenis lain ditolak', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(new File(['NIK;Nama'], 'data-dusun-3.csv', { type: 'text/csv' }))
    expect(lap.namaBerkas).toBe('data-dusun-3.csv')
    const g = await galatDari(unggahImpor(new File(['x'], 'foto.png', { type: 'image/png' })))
    expect(g).toMatchObject({ kode: 'VALIDATION', fields: { berkas: 'Berkas harus .xlsx atau .csv' } })
  })
  it('Kepala Desa → FORBIDDEN (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(unggahImpor(null))).kode).toBe('FORBIDDEN')
  })
})

describe('POST /impor/penduduk/:id/konfirmasi (fokus review 2 dan 3)', () => {
  it('baris bermasalah yang belum dilewati → VALIDATION per baris', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const g = await galatDari(konfirmasiImpor(lap.id, { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: [] }))
    expect(g.kode).toBe('VALIDATION')
    expect(Object.keys(g.fields)).toEqual(BERMASALAH.map((n) => `baris.${n}`))
  })
  it('lewati yang bermasalah → 12 penduduk dan 4 KK; dicatat; konfirmasi kedua → CONFLICT', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const masukan = { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: BERMASALAH }
    const hasil = await konfirmasiImpor(lap.id, masukan)
    expect(hasil).toMatchObject({ penduduk: 12, keluarga: 4, dilewati: 5 })
    expect(hasil.laporan.find((b) => b.nomor === 8)).toEqual({ nomor: 8, status: 'dilewati', keterangan: 'NIK sudah terdaftar di Sinfodes' })
    expect(await ambilRingkasanPenduduk()).toMatchObject({ jiwa: 2824, kk: 810 })
    expect((await ambilBeranda()).bukuHariIni).toContainEqual(
      expect.objectContaining({ jenis: 'penduduk-impor', ringkasan: 'Impor penduduk · 12 penduduk, 4 KK (pendataan-rt-teluk-rengas.xlsx)' }),
    )
    expect((await galatDari(konfirmasiImpor(lap.id, masukan))).kode).toBe('CONFLICT')
  })
  it('perbaikan dari pengguna dipakai; kolom yang tidak dikenali bisa dipetakan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const pemetaan = lap.kolom.map((k) => k.field ?? (k.judul === 'Gol. Drh' ? 'golonganDarah' : null))
    const hasil = await konfirmasiImpor(lap.id, { pemetaan, perbaikan: { '13': { tanggalLahir: '28/02/2009' } }, lewati: [5, 8, 12, 17] })
    expect(hasil).toMatchObject({ penduduk: 13, keluarga: 4, dilewati: 4 })
  })
  it('pemetaan tanpa kolom wajib → VALIDATION', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lap = await unggahImpor(null)
    const pemetaan = lap.kolom.map((k) => (k.field === 'nik' ? null : k.field))
    const g = await galatDari(konfirmasiImpor(lap.id, { pemetaan, perbaikan: {}, lewati: BERMASALAH }))
    expect(g).toMatchObject({ kode: 'VALIDATION', message: 'Pemetaan kolom belum lengkap.' })
  })
})

describe('impor desa baru (tahap 6C)', () => {
  it('desa tanpa dusun: impor ditolak dengan arahan ke Pengaturan › Wilayah', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await galatDari(unggahImpor(null))).toMatchObject({
      kode: 'VALIDATION',
      message: 'Desa belum punya dusun. Atur dusun, RW, dan RT di Pengaturan › Wilayah sebelum mengimpor penduduk.',
    })
  })
  it('desa baru dengan dusun: 12 baris contoh masuk ke wilayahnya; jiwa Sungai Sialang tetap (fokus review 1)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    await simpanWilayah({
      istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
      dusun: [
        {
          id: 'baru-1', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani',
          rw: [{ nomor: '001', ketua: 'Rasyid', rt: [{ nomor: '001', ketua: 'Udin' }, { nomor: '002', ketua: 'Usman' }] }],
        },
      ],
    })
    const lap = await unggahImpor(null)
    await konfirmasiImpor(lap.id, { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: BERMASALAH })
    const baru = ambilDb().penduduk.filter((p) => p.desaId === 'desa_tanjung_lamo')
    expect(baru).toHaveLength(12)
    expect(new Set(baru.map((p) => `${p.dusunId} ${p.rw}`))).toEqual(new Set(['dsn_tl_1 001']))
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2812)
  })
})
