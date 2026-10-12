import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import {
  ambilPengaturanDesa, ambilPenomoran, ambilWilayah, simpanIdentitas, simpanPenomoran, simpanWilayah,
} from '@/api/pengaturan'
import { ambilSesi } from '@/api/sesi'
import { daftarLembaga } from '@/api/tata-kelola'
import { formDariIdentitas, isianIdentitas } from '@/domain/pengaturan/identitas'
import { formDariWilayah } from '@/domain/pengaturan/wilayah'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

async function isianSekarang() {
  return isianIdentitas(formDariIdentitas((await ambilPengaturanDesa()).identitas))
}

describe('Pengaturan desa (SPEC §8)', () => {
  it('Operator dan Sekdes boleh; Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.sekdes]) {
      masukSebagai(akun)
      expect((await ambilPengaturanDesa()).identitas.nama).toBe('Sungai Sialang')
    }
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(ambilPengaturanDesa())).kode).toBe('FORBIDDEN')
      expect((await galatDari(ambilWilayah())).kode).toBe('FORBIDDEN')
      expect((await galatDari(ambilPenomoran())).kode).toBe('FORBIDDEN')
    }
  })
  it('identitas: kepala desa dari akun Pengguna; perubahan tersimpan dan ikut di sesi (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const awal = await ambilPengaturanDesa()
    expect(awal).toMatchObject({ kepalaDesa: 'H. Muhammad Nasir', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan' })
    const baru = await simpanIdentitas({ ...(await isianSekarang()), alamatKantor: 'Jalan Poros Desa No. 1', lambang: PNG_KECIL })
    expect(baru.identitas).toMatchObject({ alamatKantor: 'Jalan Poros Desa No. 1', lambang: PNG_KECIL })
    expect((await ambilSesi()).desa).toMatchObject({ alamatKantor: 'Jalan Poros Desa No. 1', lambang: PNG_KECIL })
  })
  it('identitas tidak valid → VALIDATION per isian; lambang bukan gambar tidak tersimpan (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const g = await galatDari(simpanIdentitas({ ...(await isianSekarang()), kodePos: '12', lambang: 'data:text/plain;base64,QUJD' }))
    expect(g).toMatchObject({
      kode: 'VALIDATION',
      fields: { kodePos: 'Kode pos terdiri dari 5 angka', lambang: 'Berkas harus gambar PNG, JPG, WebP, atau SVG.' },
    })
    expect((await ambilPengaturanDesa()).identitas.lambang ?? null).toBeNull()
  })
  it('wilayah: nama kepala dusun dan ketua RT ikut berubah di Lembaga Desa; istilah baru ikut di sesi (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const w = formDariWilayah(await ambilWilayah())
    expect(w.dusun.map((d) => d.nama)).toEqual(['Kampung Tengah', 'Sialang Jaya', 'Teluk Rengas', 'Sungai Lamo'])
    w.istilah.dusun = 'Jorong'
    w.dusun[0].kepalaDusun = 'Amran Syah'
    w.dusun[0].rw[0].rt[0].ketua = 'Jufri Hasan'
    const hasil = await simpanWilayah(w)
    expect(hasil.istilah.dusun).toBe('Jorong')
    expect(hasil.dusun[0].rw[0].rt[0].ketua).toBe('Jufri Hasan')
    const pengurus = await daftarLembaga()
    expect(pengurus.find((p) => p.jabatan === 'Kepala Dusun I')?.nama).toBe('Amran Syah')
    expect(pengurus.find((p) => p.jabatan === 'Ketua RT 001 / RW 001')?.nama).toBe('Jufri Hasan')
    expect((await ambilSesi()).desa.istilahWilayah.dusun).toBe('Jorong')
  })
  it('wilayah: susunan yang berbeda ditolak (CONFLICT); nama kosong ditandai per isian', async () => {
    masukSebagai(AKUN_UJI.operator)
    const kurangRt = formDariWilayah(await ambilWilayah())
    kurangRt.dusun[0].rw[0].rt.pop()
    expect((await galatDari(simpanWilayah(kurangRt))).kode).toBe('CONFLICT')
    const kosong = formDariWilayah(await ambilWilayah())
    kosong.dusun[1].nama = ''
    expect(await galatDari(simpanWilayah(kosong))).toMatchObject({ kode: 'VALIDATION', fields: { 'dusun.1.nama': 'Nama dusun wajib diisi' } })
  })
  it('penomoran: format bawaan dan contoh nomor berikutnya; format kembar ditolak (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const p = await ambilPenomoran()
    expect(p).toMatchObject({ formatNomor: '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}', urutan: 'per-tahun', kodeSurat: 'SS' })
    expect(p.contoh.urutPerTahun).toBeGreaterThan(p.contoh.urutPerJenis)
    const baru = await simpanPenomoran({ formatNomor: '{tahun}/{urut}/{kodeDesa}', urutan: 'per-tahun', kodeSurat: 'sl' })
    expect(baru).toMatchObject({ formatNomor: '{tahun}/{urut}/{kodeDesa}', kodeSurat: 'SL' })
    expect(ambilDb().desa.find((d) => d.id === 'desa_sungai_sialang')?.kodeSurat).toBe('SL')
    expect(await galatDari(simpanPenomoran({ formatNomor: '{urut}/{kodeDesa}', urutan: 'per-tahun', kodeSurat: 'SS' }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { formatNomor: 'Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.' },
    })
  })
  it('penomoran per jenis surat wajib memuat kode jenis: SKTM dan SKP sama-sama berklasifikasi 400 (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect(await galatDari(simpanPenomoran({ formatNomor: '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}', urutan: 'per-jenis', kodeSurat: 'SS' }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { formatNomor: 'Urutan per jenis surat wajib memuat kode jenis surat, supaya nomor antar-jenis tidak kembar.' },
    })
    const baru = await simpanPenomoran({ formatNomor: '{klasifikasi}/{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis', kodeSurat: 'SS' })
    expect(baru).toMatchObject({ formatNomor: '{klasifikasi}/{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis' })
    expect(baru.contoh.kode).toMatch(/^[A-Z]+$/)
  })
})
