// Kembaran irisan dari apps/web/src/mocks/handlers/alamat.test.ts: 9 dari 15 butir asal dipakai (6 utuh, 3 diadaptasi).
// Tidak disalin: kabupaten (8D), warga dan Konsol (8D), website publik (8H), penerbitan draf (8H), dan petunjuk alamat
// lintas desa (Keputusan 5 rencana 8C).
import { describe, expect, it } from 'vitest'
import { ambilAlamat } from '@/api/alamat'
import { masuk } from '@/api/sesi'
import { masukSebagai, pakaiApiNyata } from '../api-nyata'
import { AKUN_UJI } from '@sinfodes/demo/uji-akun'

const api = pakaiApiNyata()

describe('GET /alamat: desa dibaca dari alamat (SPEC-V0.2 §4.5)', () => {
  it('alamat desa', async () => {
    expect(await ambilAlamat()).toMatchObject({
      jenis: 'desa',
      desa: { label: 'sungaisialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', status: 'Aktif' },
    })
  })

  it('alamat lama v0.1 menjadi alias', async () => {
    api.keAlamat('sungai-sialang')
    expect(await ambilAlamat()).toEqual({ jenis: 'alias', labelBaru: 'sungaisialang' })
  })

  it('desa tidak dikenal → 404', async () => {
    api.keAlamat('tidakada')
    await expect(ambilAlamat()).rejects.toMatchObject({ kode: 'NOT_FOUND', status: 404 })
  })

  it('induk dan Konsol', async () => {
    api.keAlamat(null)
    expect(await ambilAlamat()).toEqual({ jenis: 'induk' })
    api.keAlamat('konsol')
    expect(await ambilAlamat()).toEqual({ jenis: 'konsol' })
  })
})

describe('sesi terkunci per alamat (SPEC-V0.2 §4.3)', () => {
  it('cookie panel Sungai Sialang tidak berlaku di alamat Tanjung Lamo', async () => {
    await masukSebagai(AKUN_UJI.operator)
    api.keAlamat('tanjunglamo')
    const { ambilSesi } = await import('@/api/sesi')
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('akun desa lain dengan kata sandi benar dijawab sama seperti kata sandi salah', async () => {
    // Perbedaan sengaja (Keputusan 5): API tiruan menjawab 403 dengan alamat desa akun; server nyata menjawab 422 yang sama
    // persis dengan kata sandi salah, supaya tidak membocorkan akun mana terdaftar di desa mana.
    const lain = await masuk('operator@tanjunglamo.desa.id', 'demo').then(() => null, (e: unknown) => e)
    const salah = await masuk('operator@tanjunglamo.desa.id', 'salah').then(() => null, (e: unknown) => e)
    expect(lain).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kataSandi: 'Email atau kata sandi salah.' } })
    expect(lain).toEqual(salah)
  })

  it('kata sandi salah tidak membocorkan desa akun (fokus review 5)', async () => {
    const e = await masuk('operator@tanjunglamo.desa.id', 'salah').then(() => null, (galat: unknown) => galat)
    expect(e).toMatchObject({ kode: 'VALIDATION', status: 422 })
    expect((e as { fields?: Record<string, string> }).fields?.alamatDesa).toBeUndefined()
  })

  it('panel desa tidak bisa dimasuki dari alamat Konsol', async () => {
    api.keAlamat('konsol')
    // Perbedaan sengaja: API tiruan menjawab 403; server nyata tidak punya desa di alamat itu dan menjawab 404.
    await expect(masuk('rosmiati@sungaisialang.desa.id', 'demo')).rejects.toMatchObject({ kode: 'NOT_FOUND', status: 404 })
  })
})

describe('tampilanWarga di GET /alamat (rencana 7E-1 Tugas 2)', () => {
  it('tema warga desa aktif sama dengan data tiruan; tidak ada di alamat induk dan Konsol; desa Persiapan tanpa tema', async () => {
    const sebelum = (await ambilAlamat()) as { desa: { tampilanWarga: unknown } }
    expect(sebelum.desa.tampilanWarga).toEqual({ warnaUtama: '#1F4E79', logo: null, fotoLatar: null, sambutan: null, huruf: 'plex' })
    api.keAlamat(null)
    expect(await ambilAlamat()).toEqual({ jenis: 'induk' })
    api.keAlamat('tanjunglamo')
    expect(await ambilAlamat()).toMatchObject({ jenis: 'desa', desa: { status: 'Persiapan', tampilanWarga: null } })
  })
})
