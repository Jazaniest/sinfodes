// Kembaran irisan dari apps/web/src/mocks/handlers/kependudukan.test.ts: pertanyaan yang sama diajukan ke server sungguhan
// lewat `panggilApi` dan modul `api/*` web yang sama, dan jawabannya harus sama dengan API tiruan. Ini irisan 8C: 10 dari 18 butir
// asal (8 utuh, 2 diadaptasi). Sisanya (riwayat, keluarga, cakupan Kepala Dusun, penulisan) ada di `kependudukan-lanjutan.test.ts`
// (8E1, dilengkapi 8E2); preset "Pendatang tahun ini" berjalan sejak tabel mutasi ada (8E2).
import { describe, expect, it } from 'vitest'
import { SESI_KUKI } from '@/api/client'
import { cariPenduduk, daftarPenduduk, ambilRingkasanPenduduk } from '@/api/penduduk'
import { ambilSesi, keluar, masuk } from '@/api/sesi'
import { AKUN_UJI } from '@sinfodes/demo/uji-akun'
import { masukSebagai, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata()

describe('sesi', () => {
  it('sesi membawa daftar dusun desanya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await ambilSesi()).dusun.map((d) => d.nomor)).toEqual([1, 2, 3, 4])
  })

  it('masuk mengembalikan sesi lengkap', async () => {
    const hasil = await masuk('hendri@sungaisialang.desa.id', 'demo')
    // Perbedaan sengaja: server nyata tidak mengirim token (sesi di cookie HttpOnly); `api/sesi.ts` mengisi penanda lokal.
    expect(hasil.token).toBe(SESI_KUKI)
    expect(hasil.sesi.dusun).toHaveLength(4)
    expect(hasil.sesi.pengguna.id).toBe('pgn_hendri')
  })

  it('keluar mencabut sesi: sesi berikutnya UNAUTHENTICATED', async () => {
    await masukSebagai(AKUN_UJI.operator)
    await keluar()
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('sesi terkunci per alamat: cookie Sungai Sialang tidak berlaku di alamat Tanjung Lamo', async () => {
    await masukSebagai(AKUN_UJI.operator)
    api.keAlamat('tanjunglamo')
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    api.keAlamat('sungaisialang')
    expect((await ambilSesi()).pengguna.id).toBe('pgn_rosmiati')
  })
})

describe('penduduk', () => {
  it('ringkasan: 2.812 jiwa, 806 KK, diperbarui hari ini', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await ambilRingkasanPenduduk()
    expect(r).toMatchObject({ jiwa: 2812, kk: 806 })
    expect(r.diperbaruiPada?.startsWith('2026-09-24')).toBe(true)
  })

  it('cari lewat NIK berspasi; baris membawa nomor KK', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await cariPenduduk('140509 520391 8002', {})
    expect(r.data).toHaveLength(1)
    expect(r.data[0]).toMatchObject({ nama: 'Siti Rahmah', nomorKk: '1405092011238004' })
  })

  it('cari lewat potongan nomor KK menemukan seluruh anggota', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await cariPenduduk('2011238004', {})).meta.total).toBe(4)
  })

  it('kata terlalu pendek tidak mencocokkan apa pun', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await cariPenduduk('140', {})).meta.total).toBe(0)
  })

  it('pencarian tetap menghormati filter', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await cariPenduduk('1405095203918002', { dusun: 2 })).meta.total).toBe(0)
  })

  it('preset pendatang tahun ini berisi warga yang datang di 2026 (tabel mutasi ada sejak 8E2)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await daftarPenduduk({ preset: 'pendatang-tahun-ini', pageSize: 100 })
    expect(r.meta.total).toBeGreaterThanOrEqual(2)
    expect(r.data.every((p) => p.nik !== null && !p.nik.startsWith('140509'))).toBe(true)
  })

  it('mantan penduduk terbuka lewat filter status dan tidak ikut jiwa', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await daftarPenduduk({ status: 'Meninggal', pageSize: 100 })
    expect(r.meta.total).toBeGreaterThanOrEqual(1)
    expect(r.data.every((p) => p.statusDasar === 'Meninggal')).toBe(true)
    // Detail mantan penduduk (`GET /penduduk/:id`) diperiksa di kependudukan-lanjutan.test.ts.
  })

  it('daftar bawaan: 25 baris urut nama dari 2.812 jiwa', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const r = await daftarPenduduk({})
    expect(r.meta).toEqual({ page: 1, pageSize: 25, total: 2812 })
    const nama = r.data.map((p) => p.nama)
    expect(nama).toEqual([...nama].sort((a, b) => a.localeCompare(b, 'id')))
  })

  it('Kaur Keuangan tidak berhak', async () => {
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    await expect(daftarPenduduk({})).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })
})

describe('cakupan Kepala Dusun II (fokus review 1)', () => {
  it('pencarian NIK warga dusun lain tidak menemukan apa pun', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    expect((await cariPenduduk('1405095203918002', {})).meta.total).toBe(0)
  })
})
