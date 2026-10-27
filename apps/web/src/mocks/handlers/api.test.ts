// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { daftarSchema, galatSchema } from '@/domain/api'
import { hitungUmur } from '@/domain/format/tanggal'
import { pendudukSchema } from '@/domain/penduduk/schema'
import { sesiAdminSchema } from '@/domain/pengguna/schema'
import { muatDb } from '../db'
import { aturModeJaringan } from '../jaringan'
import { serverUji } from '../node'
import { penyimpananMemori } from '../penyimpanan'

const BASE = 'http://localhost/api/v1'
const OPERATOR = 'rosmiati@sungaisialang.desa.id'
const daftarPenduduk = daftarSchema(pendudukSchema)

const kirimMasuk = (email: string, kataSandi: string) =>
  fetch(`${BASE}/sesi/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, kataSandi }),
  })
const masuk = async (email: string) => ((await (await kirimMasuk(email, 'demo')).json()) as { token: string }).token
const ambil = (jalur: string, token?: string) =>
  fetch(`${BASE}${jalur}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

beforeAll(async () => {
  await muatDb(penyimpananMemori(), new Date('2026-09-24T02:00:00Z'))
  serverUji.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  serverUji.resetHandlers()
  aturModeJaringan('instan')
})
afterAll(() => serverUji.close())

describe('sesi', () => {
  it('kata sandi salah → 422 dengan galat pada kolom', async () => {
    const r = await kirimMasuk(OPERATOR, 'salah')
    expect(r.status).toBe(422)
    expect(galatSchema.parse(await r.json()).error.fields?.kataSandi).toBe('Email atau kata sandi salah.')
  })
  it('tanpa token → 401 UNAUTHENTICATED', async () => {
    const r = await ambil('/sesi')
    expect(r.status).toBe(401)
    expect(galatSchema.parse(await r.json()).error.code).toBe('UNAUTHENTICATED')
  })
  it('dengan token → sesi admin lengkap dengan desa', async () => {
    const sesi = sesiAdminSchema.parse(await (await ambil('/sesi', await masuk(OPERATOR))).json())
    expect(sesi.pengguna.nama).toBe('Rosmiati')
    expect(sesi.desa.nama).toBe('Sungai Sialang')
  })
})

describe('GET /penduduk', () => {
  it('operator: halaman pertama 25 orang dari 2.812, urut nama', async () => {
    const isi = daftarPenduduk.parse(await (await ambil('/penduduk', await masuk(OPERATOR))).json())
    expect(isi.meta).toEqual({ page: 1, pageSize: 25, total: 2812 })
    const nama = isi.data.map((p) => p.nama)
    expect(nama).toHaveLength(25)
    expect(nama).toEqual([...nama].sort((a, b) => a.localeCompare(b, 'id')))
  })
  it('filter dusun dan jenis kelamin', async () => {
    const r = await ambil('/penduduk?dusun=2&jk=P&pageSize=100', await masuk(OPERATOR))
    const isi = daftarPenduduk.parse(await r.json())
    expect(isi.data.length).toBeGreaterThan(0)
    expect(isi.data.every((p) => p.dusunId === 'dsn_ss_2' && p.jenisKelamin === 'P')).toBe(true)
  })
  it('preset balita', async () => {
    const isi = daftarPenduduk.parse(await (await ambil('/penduduk?preset=balita&pageSize=100', await masuk(OPERATOR))).json())
    expect(isi.data.length).toBeGreaterThan(0)
    expect(isi.data.every((p) => hitungUmur(p.tanggalLahir, new Date()).tahun <= 4)).toBe(true)
  })
  it('ukuran halaman tidak valid → 422', async () =>
    expect((await ambil('/penduduk?pageSize=30', await masuk(OPERATOR))).status).toBe(422))
  it('Kaur Keuangan tidak berhak → 403', async () =>
    expect((await ambil('/penduduk', await masuk('nurhayati@sungaisialang.desa.id'))).status).toBe(403))
  it('Kepala Dusun II hanya melihat dusunnya', async () => {
    const token = await masuk('sukardi@sungaisialang.desa.id')
    const isi = daftarPenduduk.parse(await (await ambil('/penduduk?pageSize=100', token)).json())
    expect(isi.data.every((p) => p.dusunId === 'dsn_ss_2')).toBe(true)
    const lain = daftarPenduduk.parse(await (await ambil('/penduduk?dusun=1', token)).json())
    expect(lain.meta.total).toBe(0)
  })
  it('mode jaringan gagal → 503 SERVER', async () => {
    const token = await masuk(OPERATOR)
    aturModeJaringan('gagal')
    const r = await ambil('/penduduk', token)
    expect(r.status).toBe(503)
    expect(galatSchema.parse(await r.json()).error.code).toBe('SERVER')
  })
})

describe('GET /penduduk/:id', () => {
  it('ditemukan', async () => {
    const r = await ambil('/penduduk/pdk_siti_rahmah', await masuk(OPERATOR))
    expect(pendudukSchema.parse(await r.json()).nama).toBe('Siti Rahmah')
  })
  it('di luar cakupan Kepala Dusun → 404', async () =>
    expect((await ambil('/penduduk/pdk_siti_rahmah', await masuk('sukardi@sungaisialang.desa.id'))).status).toBe(404))
})
