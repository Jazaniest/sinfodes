// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { galatSchema } from '@/domain/api'
import { ambilDb, muatDb } from '../db'
import { aturModeJaringan } from '../jaringan'
import { serverUji } from '../node'
import { penyimpananMemori } from '../penyimpanan'

/** URL API di alamat tertentu (SPEC-V0.2 §4.1). */
const url = (label: string, jalur: string) => `http://${label}.sinfodes.localhost/api/v1${jalur}`
const ambil = (alamat: string, token?: string) => fetch(alamat, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
const masuk = (label: string, email: string, kataSandi = 'demo') =>
  fetch(url(label, '/kabupaten/sesi/masuk'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, kataSandi }),
  })
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const EMAIL_FAJAR = 'admin.pelalawan@demo.sinfodes.id'

beforeAll(() => serverUji.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  await muatDb(penyimpananMemori(), new Date('2026-09-24T02:00:00Z'))
})
afterEach(() => {
  serverUji.resetHandlers()
  aturModeJaringan('instan')
})
afterAll(() => serverUji.close())

describe('sesi kabupaten (SPEC-V0.2 §8.1)', () => {
  it('Admin Pelalawan masuk di alamat kabupatennya', async () => {
    const r = await masuk('kab-pelalawan', EMAIL_FAJAR)
    expect(r.status).toBe(200)
    const hasil = (await r.json()) as { token: string; sesi: { kabupaten: { label: string }; pengguna: { peran: string } } }
    expect(hasil.token).toBe('kab.kab_fajar')
    expect(hasil.sesi.kabupaten.label).toBe('kab-pelalawan')
    expect(hasil.sesi.pengguna.peran).toBe('admin')
    expect((await ambil(url('kab-pelalawan', '/kabupaten/sesi'), hasil.token)).status).toBe(200)
  })
  it('akun kabupaten lain ditolak dengan petunjuk alamatnya, hanya setelah kata sandi benar', async () => {
    const benar = await masuk('kab-siak', EMAIL_FAJAR)
    expect(benar.status).toBe(403)
    expect(await galat(benar)).toMatchObject({
      message: 'Akun ini terdaftar di Kabupaten Pelalawan.', fields: { alamatKabupaten: 'kab-pelalawan' },
    })
    const salah = await masuk('kab-siak', EMAIL_FAJAR, 'salah')
    expect(salah.status).toBe(422)
    expect((await galat(salah)).fields?.alamatKabupaten).toBeUndefined()
  })
  it('kabupaten yang belum mitra dan alamat selain kabupaten tidak punya halaman masuk', async () => {
    const r = await masuk('kab-kampar', EMAIL_FAJAR)
    expect(r.status).toBe(404)
    expect((await galat(r)).message).toBe('Kabupaten ini belum memakai Sinfodes.')
    expect((await masuk('sungaisialang', EMAIL_FAJAR)).status).toBe(404)
    expect((await masuk('konsol', EMAIL_FAJAR)).status).toBe(404)
  })
  it('token kabupaten hanya sah di alamat kabupatennya', async () => {
    expect((await ambil(url('kab-siak', '/kabupaten/sesi'), 'kab.kab_fajar')).status).toBe(401)
    expect((await ambil(url('kab-siak', '/kabupaten/sesi'), 'kab.kab_wahyu')).status).toBe(200)
  })
  it('token tidak tertukar antarbagian (fokus review 2)', async () => {
    expect((await ambil(url('sungaisialang', '/sesi'), 'kab.kab_fajar')).status).toBe(401)
    expect((await ambil(url('konsol', '/konsol/sesi'), 'kab.kab_fajar')).status).toBe(401)
    expect((await ambil(url('sungaisialang', '/warga/sesi'), 'kab.kab_fajar')).status).toBe(401)
    expect((await ambil(url('kab-pelalawan', '/kabupaten/sesi'), 'demo.pgn_rosmiati')).status).toBe(401)
    expect((await ambil(url('kab-pelalawan', '/kabupaten/sesi'), 'konsol.kns_dina')).status).toBe(401)
    expect((await ambil(url('kab-pelalawan', '/kabupaten/sesi'), 'warga.pdk_siti_rahmah')).status).toBe(401)
  })
  it('akun nonaktif tidak bisa masuk, dan tokennya berhenti berlaku', async () => {
    const akun = ambilDb().penggunaKabupaten.find((p) => p.id === 'kab_fajar')
    if (akun) akun.aktif = false
    const r = await masuk('kab-pelalawan', EMAIL_FAJAR)
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toBe('Email atau kata sandi salah.')
    expect((await ambil(url('kab-pelalawan', '/kabupaten/sesi'), 'kab.kab_fajar')).status).toBe(401)
  })
})
