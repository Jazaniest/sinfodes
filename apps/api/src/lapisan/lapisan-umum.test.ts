import { galatSchema } from '@sinfodes/kontrak/api'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../test/basisdata'
import { klienTanpaDb, rakitApp, sisipSesiKabupatenUji, sisipSesiKonsolUji, sisipSesiUji, sisipSesiWargaUji } from '../../test/rakit-app'
import type { Klien } from '../basisdata/klien'
import { ATURAN_SESI, keluargaDariJalur, namaKuki } from '../sesi/pelaku'
import { butuhKabupaten, butuhKonsol, butuhPelakuPanel, butuhWarga } from './akses'

const AWAL = new Date('2026-09-24T02:00:00Z')
const MENIT = 60_000
const JAM = 60 * MENIT
const HARI = 24 * JAM
const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const INDUK = 'http://sinfodes.localhost'
const KONSOL = 'http://konsol.sinfodes.localhost'
const PELALAWAN = 'http://kab-pelalawan.sinfodes.localhost'
const SIAK = 'http://kab-siak.sinfodes.localhost'
const SITI = 'pdk_siti_rahmah'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})

function pantau(klien: Klien) {
  const hitung: Record<string, number> = { desa: 0, kabupaten: 0, konsol: 0, publik: 0 }
  const dibungkus: Klien = {
    dalamTransaksi(peran, konteks, fn) {
      hitung[peran]++
      return klien.dalamTransaksi(peran, konteks, fn)
    },
    tutup: () => klien.tutup(),
  }
  return { klien: dibungkus, hitung }
}

/** Aplikasi dengan satu rute contoh per keluarga pelaku, memakai pembantu lapisan persis seperti rute sungguhan nanti. */
function rakitUmum(opsi: { klien?: Klien; waktu?: () => Date } = {}) {
  const r = rakitApp({ klien: opsi.klien ?? uji.klien, waktu: opsi.waktu })
  const { app } = r
  app.get('/api/v1/contoh/panel', (c) => c.json({ id: butuhPelakuPanel(c).id }))
  app.get('/api/v1/warga/contoh', (c) => c.json({ pendudukId: butuhWarga(c).pendudukId }))
  app.get('/api/v1/konsol/contoh', (c) => c.json({ id: butuhKonsol(c).pengguna.id }))
  app.get('/api/v1/kabupaten/contoh', (c) => {
    const p = butuhKabupaten(c)
    return c.json({ id: p.pengguna.id, label: p.kabupaten.label })
  })
  app.get('/api/v1/contoh/alamat', (c) => c.json({ jenis: c.get('alamat').konteks.jenis }))
  return r
}
type App = ReturnType<typeof rakitUmum>['app']

const minta = (app: App, url: string, kuki?: string, tambahan: Record<string, string> = {}) =>
  app.fetch(new Request(url, { headers: { ...(kuki ? { Cookie: kuki } : {}), ...tambahan } }))
const status = async (app: App, url: string, kuki?: string, tambahan: Record<string, string> = {}) => (await minta(app, url, kuki, tambahan)).status

describe('keluarga pelaku dan nama cookie (SPEC-V0.3 §8.1)', () => {
  it('keluarga ditentukan dari jalur, dan nama cookie memakai awalan yang disetel', () => {
    expect(keluargaDariJalur('/warga/masuk')).toBe('warga')
    expect(keluargaDariJalur('/warga/sesi')).toBe('warga')
    expect(keluargaDariJalur('/konsol/sesi/masuk')).toBe('konsol')
    expect(keluargaDariJalur('/kabupaten/sesi')).toBe('kabupaten')
    for (const panel of ['/sesi', '/sesi/masuk', '/penduduk', '/alamat', '/pengaturan/akses-sinfodes', '/wargaku']) expect(keluargaDariJalur(panel), panel).toBe('panel')
    expect(namaKuki('panel', '__Host-')).toBe('__Host-panel')
    expect(namaKuki('warga', '__Host-')).toBe('__Host-warga')
    expect(namaKuki('konsol', '__Secure-')).toBe('__Secure-konsol')
    expect(namaKuki('kabupaten', '__Host-')).toBe('__Host-kab')
  })

  it('aturan masa sesi: panel 2 jam dan 12 jam, warga 30 hari tanpa batas mutlak, Konsol 30 menit dan 8 jam, kabupaten 2 jam dan 12 jam', () => {
    expect(ATURAN_SESI).toEqual({
      panel: { menganggurMs: 2 * JAM, mutlakMs: 12 * JAM },
      warga: { menganggurMs: 30 * HARI, mutlakMs: null },
      konsol: { menganggurMs: 30 * MENIT, mutlakMs: 8 * JAM },
      kabupaten: { menganggurMs: 2 * JAM, mutlakMs: 12 * JAM },
    })
  })
})

describe('peran basis data menurut jenis alamat (SPEC-V0.3 §7.3, §6.2)', () => {
  it('desa memakai peran desa, Konsol peran konsol, kab-... peran kabupaten, dan induk tidak membuka transaksi', async () => {
    const hitungDi = async (url: string) => {
      const p = pantau(uji.klien)
      const { app } = rakitUmum({ klien: p.klien })
      expect(await status(app, `${url}/api/v1/contoh/alamat`)).toBe(200)
      return p.hitung
    }
    expect(await hitungDi(SS)).toEqual({ desa: 1, kabupaten: 0, konsol: 0, publik: 1 })
    expect(await hitungDi(KONSOL)).toEqual({ desa: 0, kabupaten: 0, konsol: 1, publik: 0 })
    expect(await hitungDi(PELALAWAN)).toEqual({ desa: 0, kabupaten: 1, konsol: 0, publik: 1 })
    expect(await hitungDi(INDUK)).toEqual({ desa: 0, kabupaten: 0, konsol: 0, publik: 0 })
  })

  it('alamat kab-... yang bukan kabupaten mitra tidak membuka transaksi kabupaten dan tidak punya pelaku', async () => {
    const p = pantau(uji.klien)
    const { app } = rakitUmum({ klien: p.klien })
    const sesi = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL })
    expect(await status(app, 'http://kab-kampar.sinfodes.localhost/api/v1/kabupaten/contoh', sesi.kuki)).toBe(401)
    expect(p.hitung.kabupaten).toBe(0)
  })
})

describe('sesi warga, Konsol, dan kabupaten sah di alamat dan keluarga rutenya', () => {
  it('cookie yang tepat di alamat yang tepat memberi pelaku', async () => {
    const { app } = rakitUmum()
    const warga = await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: 'desa_sungai_sialang', dibuat: AWAL })
    const konsol = await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: AWAL })
    const kab = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL })
    expect(await (await minta(app, `${SS}/api/v1/warga/contoh`, warga.kuki)).json()).toEqual({ pendudukId: SITI })
    expect(await (await minta(app, `${KONSOL}/api/v1/konsol/contoh`, konsol.kuki)).json()).toEqual({ id: 'kns_dina' })
    expect(await (await minta(app, `${PELALAWAN}/api/v1/kabupaten/contoh`, kab.kuki)).json()).toEqual({ id: 'kab_fajar', label: 'kab-pelalawan' })
  })

  it('tertukar (Review Focus 1): cookie satu pelaku atau satu alamat tidak diterima pelaku atau alamat lain', async () => {
    const { app } = rakitUmum()
    const panel = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: 'desa_sungai_sialang', dibuat: AWAL })
    const warga = await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: 'desa_sungai_sialang', dibuat: AWAL })
    const konsol = await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: AWAL })
    const kab = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL })
    const nilai = (kuki: string) => kuki.split('=')[1]
    // Cookie pelaku lain di rute keluarga ini.
    expect(await status(app, `${SS}/api/v1/contoh/panel`, warga.kuki)).toBe(401)
    expect(await status(app, `${SS}/api/v1/warga/contoh`, panel.kuki)).toBe(401)
    // Nama cookie benar, isi dari jenis lain.
    expect(await status(app, `${SS}/api/v1/contoh/panel`, `__Host-panel=${nilai(warga.kuki)}`)).toBe(401)
    expect(await status(app, `${SS}/api/v1/warga/contoh`, `__Host-warga=${nilai(panel.kuki)}`)).toBe(401)
    expect(await status(app, `${KONSOL}/api/v1/konsol/contoh`, `__Host-konsol=${nilai(kab.kuki)}`)).toBe(401)
    expect(await status(app, `${PELALAWAN}/api/v1/kabupaten/contoh`, `__Host-kab=${nilai(konsol.kuki)}`)).toBe(401)
    // Alamat yang salah.
    expect(await status(app, `${SS}/api/v1/konsol/contoh`, konsol.kuki)).toBe(401)
    expect(await status(app, `${TL}/api/v1/warga/contoh`, warga.kuki)).toBe(401)
    expect(await status(app, `${INDUK}/api/v1/warga/contoh`, warga.kuki)).toBe(401)
    expect(await status(app, `${KONSOL}/api/v1/contoh/panel`, panel.kuki)).toBe(401)
    expect(await status(app, `${KONSOL}/api/v1/konsol/contoh`, panel.kuki)).toBe(401)
    expect(await status(app, `${SS}/api/v1/kabupaten/contoh`, kab.kuki)).toBe(401)
    expect(await status(app, `${SIAK}/api/v1/kabupaten/contoh`, kab.kuki)).toBe(401)
    expect(galatSchema.parse(await (await minta(app, `${SIAK}/api/v1/kabupaten/contoh`, kab.kuki)).json()).error.code).toBe('UNAUTHENTICATED')
    // Cookie yang benar tetap berlaku.
    expect(await status(app, `${PELALAWAN}/api/v1/kabupaten/contoh`, kab.kuki)).toBe(200)
  })

  it('pelaku bukan jenisnya ditolak pembantu: pelaku warga tidak melewati butuhPelakuPanel, dan sebaliknya', async () => {
    const { app } = rakitUmum()
    const warga = await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: 'desa_sungai_sialang', dibuat: AWAL })
    // Semua cookie dikirim bersamaan: setiap rute hanya memakai cookie keluarganya.
    const semua = `${warga.kuki}; __Host-konsol=x; __Host-kab=y`
    expect(await status(app, `${SS}/api/v1/contoh/panel`, semua)).toBe(401)
    expect(await status(app, `${SS}/api/v1/warga/contoh`, semua)).toBe(200)
  })

  it('token berbentuk demo. warga. konsol. kab. ditolak di header Authorization maupun di cookie (SPEC §8.8)', async () => {
    const { app } = rakitUmum()
    const bentuk = ['demo.pgn_rosmiati', 'warga.pdk_siti_rahmah', 'konsol.kns_dina', 'kab.kab_fajar']
    const rute: [string, string, string][] = [
      [SS, '/api/v1/contoh/panel', '__Host-panel'],
      [SS, '/api/v1/warga/contoh', '__Host-warga'],
      [KONSOL, '/api/v1/konsol/contoh', '__Host-konsol'],
      [PELALAWAN, '/api/v1/kabupaten/contoh', '__Host-kab'],
    ]
    for (const [basis, jalur, kuki] of rute) {
      for (const token of bentuk) {
        expect(await status(app, `${basis}${jalur}`, undefined, { Authorization: `Bearer ${token}` }), `${jalur} header ${token}`).toBe(401)
        expect(await status(app, `${basis}${jalur}`, `${kuki}=${token}`), `${jalur} cookie ${token}`).toBe(401)
      }
    }
  })
})

describe('masa sesi per pelaku (SPEC-V0.3 §8.2)', () => {
  it('warga: 30 hari menganggur, bergeser, tanpa batas mutlak', async () => {
    let sekarang = AWAL
    const { app } = rakitUmum({ waktu: () => sekarang })
    const s = await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: 'desa_sungai_sialang', dibuat: AWAL })
    const url = `${SS}/api/v1/warga/contoh`
    // Setiap kunjungan 29 hari sesudah yang terakhir: umur sesi melewati 100 hari, jadi tidak ada batas mutlak.
    for (const hari of [29, 58, 87, 116]) {
      sekarang = new Date(AWAL.getTime() + hari * HARI)
      expect(await status(app, url, s.kuki), `hari ${hari}`).toBe(200)
    }
    sekarang = new Date(AWAL.getTime() + 147 * HARI + MENIT)
    expect(await status(app, url, s.kuki)).toBe(401)
  })

  it('Konsol: 30 menit menganggur dan 8 jam mutlak', async () => {
    let sekarang = AWAL
    const { app } = rakitUmum({ waktu: () => sekarang })
    const url = `${KONSOL}/api/v1/konsol/contoh`
    const a = await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: AWAL })
    sekarang = new Date(AWAL.getTime() + 29 * MENIT)
    expect(await status(app, url, a.kuki)).toBe(200)
    sekarang = new Date(AWAL.getTime() + 60 * MENIT)
    expect(await status(app, url, a.kuki)).toBe(401)
    const panjang = await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: AWAL, terakhirAktif: new Date(AWAL.getTime() + 7.9 * JAM) })
    sekarang = new Date(AWAL.getTime() + 8 * JAM - MENIT)
    expect(await status(app, url, panjang.kuki)).toBe(200)
    sekarang = new Date(AWAL.getTime() + 8 * JAM + MENIT)
    expect(await status(app, url, panjang.kuki)).toBe(401)
  })

  it('kabupaten: 2 jam menganggur dan 12 jam mutlak', async () => {
    let sekarang = AWAL
    const { app } = rakitUmum({ waktu: () => sekarang })
    const url = `${PELALAWAN}/api/v1/kabupaten/contoh`
    const a = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL })
    sekarang = new Date(AWAL.getTime() + 119 * MENIT)
    expect(await status(app, url, a.kuki)).toBe(200)
    sekarang = new Date(AWAL.getTime() + 119 * MENIT + 121 * MENIT)
    expect(await status(app, url, a.kuki)).toBe(401)
    const panjang = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL, terakhirAktif: new Date(AWAL.getTime() + 11.5 * JAM) })
    sekarang = new Date(AWAL.getTime() + 12 * JAM + 5 * MENIT)
    expect(await status(app, url, panjang.kuki)).toBe(401)
  })

  it('sesi dicabut ditolak di semua keluarga, dan akun yang dinonaktifkan atau warga yang tidak lagi Hidup berhenti berlaku', async () => {
    const { app } = rakitUmum()
    const warga = await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: 'desa_sungai_sialang', dibuat: AWAL, dicabut: AWAL })
    const konsol = await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: AWAL, dicabut: AWAL })
    const kab = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL, dicabut: AWAL })
    expect(await status(app, `${SS}/api/v1/warga/contoh`, warga.kuki)).toBe(401)
    expect(await status(app, `${KONSOL}/api/v1/konsol/contoh`, konsol.kuki)).toBe(401)
    expect(await status(app, `${PELALAWAN}/api/v1/kabupaten/contoh`, kab.kuki)).toBe(401)

    const k2 = await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: AWAL })
    const b2 = await sisipSesiKabupatenUji(uji.sqlMigrasi, { penggunaId: 'kab_fajar', kabupatenKode: '14.05', dibuat: AWAL })
    const w2 = await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: 'desa_sungai_sialang', dibuat: AWAL })
    await uji.sqlMigrasi`update pengguna_konsol set aktif = false where id = 'kns_dina'`
    await uji.sqlMigrasi`update pengguna_kabupaten set aktif = false where id = 'kab_fajar'`
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Meninggal' where id = ${SITI}`
    try {
      expect(await status(app, `${KONSOL}/api/v1/konsol/contoh`, k2.kuki)).toBe(401)
      expect(await status(app, `${PELALAWAN}/api/v1/kabupaten/contoh`, b2.kuki)).toBe(401)
      expect(await status(app, `${SS}/api/v1/warga/contoh`, w2.kuki)).toBe(401)
    } finally {
      await uji.sqlMigrasi`update pengguna_konsol set aktif = true where id = 'kns_dina'`
      await uji.sqlMigrasi`update pengguna_kabupaten set aktif = true where id = 'kab_fajar'`
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = ${SITI}`
    }
  })

  it('tanpa basis data, alamat induk tidak menyentuhnya walau cookie dikirim', async () => {
    const { app } = rakitUmum({ klien: klienTanpaDb })
    expect(await status(app, `${INDUK}/api/v1/contoh/alamat`, '__Host-panel=x; __Host-warga=y')).toBe(200)
  })
})
