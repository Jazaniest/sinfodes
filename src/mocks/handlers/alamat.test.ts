// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { galatSchema } from '@/domain/api'
import { muatDb } from '../db'
import { aturModeJaringan } from '../jaringan'
import { serverUji } from '../node'
import { penyimpananMemori } from '../penyimpanan'

/** URL API di alamat tertentu; `null` berarti alamat induk (SPEC-V0.2 §4.1). */
const url = (label: string | null, jalur: string) => `http://${label ? `${label}.` : ''}sinfodes.localhost/api/v1${jalur}`
const ambil = (alamat: string, token?: string) => fetch(alamat, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
const kirim = (alamat: string, isi: unknown) =>
  fetch(alamat, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isi) })
const galat = async (r: Response) => galatSchema.parse(await r.json()).error

beforeAll(async () => {
  await muatDb(penyimpananMemori(), new Date('2026-09-24T02:00:00Z'))
  serverUji.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  serverUji.resetHandlers()
  aturModeJaringan('instan')
})
afterAll(() => serverUji.close())

describe('GET /alamat: desa dibaca dari alamat (SPEC-V0.2 §4.5)', () => {
  it('alamat desa', async () => {
    const r = await ambil(url('sungaisialang', '/alamat'))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({
      jenis: 'desa',
      desa: { label: 'sungaisialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', status: 'Aktif' },
    })
  })
  it('alamat lama v0.1 menjadi alias', async () => {
    expect(await (await ambil(url('sungai-sialang', '/alamat'))).json()).toEqual({ jenis: 'alias', labelBaru: 'sungaisialang' })
  })
  it('desa tidak dikenal → 404', async () => {
    const r = await ambil(url('tidakada', '/alamat'))
    expect(r.status).toBe(404)
    expect((await galat(r)).code).toBe('NOT_FOUND')
  })
  it('induk dan Konsol', async () => {
    expect(await (await ambil(url(null, '/alamat'))).json()).toEqual({ jenis: 'induk' })
    expect(await (await ambil(url('konsol', '/alamat'))).json()).toEqual({ jenis: 'konsol' })
  })
})

describe('sesi terkunci per alamat (SPEC-V0.2 §4.3)', () => {
  it('token panel Sungai Sialang tidak berlaku di alamat Tanjung Lamo', async () => {
    expect((await ambil(url('tanjunglamo', '/sesi'), 'demo.pgn_rosmiati')).status).toBe(401)
    expect((await ambil(url('sungaisialang', '/sesi'), 'demo.pgn_rosmiati')).status).toBe(200)
  })
  it('akun desa lain dengan kata sandi benar: 403 berisi alamat desanya', async () => {
    const r = await kirim(url('sungaisialang', '/sesi/masuk'), { email: 'operator@tanjunglamo.desa.id', kataSandi: 'demo' })
    expect(r.status).toBe(403)
    const e = await galat(r)
    expect(e.message).toBe('Akun ini terdaftar di Desa Tanjung Lamo.')
    expect(e.fields?.alamatDesa).toBe('tanjunglamo')
  })
  it('kata sandi salah tidak membocorkan desa akun (fokus review 5)', async () => {
    const r = await kirim(url('sungaisialang', '/sesi/masuk'), { email: 'operator@tanjunglamo.desa.id', kataSandi: 'salah' })
    expect(r.status).toBe(422)
    expect((await galat(r)).fields?.alamatDesa).toBeUndefined()
  })
  it('panel desa tidak bisa dimasuki dari alamat Konsol', async () => {
    const r = await kirim(url('konsol', '/sesi/masuk'), { email: 'rosmiati@sungaisialang.desa.id', kataSandi: 'demo' })
    expect(r.status).toBe(403)
    expect((await galat(r)).fields).toBeUndefined()
  })
  it('NIK warga desa lain diperlakukan seperti NIK salah', async () => {
    const r = await kirim(url('tanjunglamo', '/warga/masuk'), { nik: '1405095203918002', pin: '246810' })
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toMatch(/^NIK atau PIN salah\./)
    expect((await kirim(url('sungaisialang', '/warga/masuk'), { nik: '1405095203918002', pin: '246810' })).status).toBe(200)
  })
  it('sesi dan masuk Konsol hanya di alamat Konsol', async () => {
    expect((await ambil(url('sungaisialang', '/konsol/sesi'), 'konsol.kns_dina')).status).toBe(401)
    expect((await kirim(url('sungaisialang', '/konsol/sesi/masuk'), { email: 'dina@sinfodes.id', kataSandi: 'demo' })).status).toBe(404)
  })
  it('website publik hanya untuk desa alamat itu', async () => {
    expect((await ambil(url('tanjunglamo', '/publik/sungaisialang'))).status).toBe(404)
    expect((await ambil(url('sungaisialang', '/publik/sungaisialang'))).status).toBe(200)
  })
  it('host di luar domain induk (uji) tetap memakai desa dari token', async () => {
    expect((await ambil('http://localhost/api/v1/sesi', 'demo.pgn_rosmiati')).status).toBe(200)
  })
})
