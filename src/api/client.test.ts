// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { muatDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { penyimpananMemori } from '@/mocks/penyimpanan'
import { aturTokenSesi, panggilApi } from './client'
import { GalatApi } from './galat'
import { daftarPenduduk } from './penduduk'
import { ambilSesi, masuk } from './sesi'

const OPERATOR = 'rosmiati@sungaisialang.desa.id'

beforeAll(async () => {
  await muatDb(penyimpananMemori(), new Date('2026-09-24T02:00:00Z'))
  serverUji.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  serverUji.resetHandlers()
  aturTokenSesi(null)
})
afterAll(() => serverUji.close())

describe('panggilApi', () => {
  it('masuk lalu memakai token untuk memanggil API', async () => {
    const { token, sesi } = await masuk(OPERATOR, 'demo')
    expect(sesi.pengguna.peran).toBe('operator')
    aturTokenSesi(token)
    expect((await ambilSesi()).desa.slug).toBe('sungai-sialang')
  })
  it('galat 422 menjadi GalatApi dengan kode dan kolom', async () => {
    const galat = await masuk(OPERATOR, 'salah').catch((e: unknown) => e)
    expect(galat).toBeInstanceOf(GalatApi)
    expect(galat).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kataSandi: 'Email atau kata sandi salah.' } })
  })
  it('tanpa token → UNAUTHENTICATED', async () => {
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED', status: 401 })
  })
  it('query tanpa nilai kosong, hasil divalidasi skema', async () => {
    aturTokenSesi((await masuk(OPERATOR, 'demo')).token)
    const hasil = await daftarPenduduk({ dusun: 2, jk: undefined, pageSize: 50 })
    expect(hasil.meta.pageSize).toBe(50)
    expect(hasil.data.every((p) => p.dusunId === 'dsn_ss_2')).toBe(true)
  })
  it('jaringan putus → GalatApi SERVER berstatus 0', async () => {
    serverUji.use(http.get('*/api/v1/sesi', () => HttpResponse.error()))
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'SERVER', status: 0 })
  })
  it('galat berformat asing → SERVER dengan status aslinya', async () => {
    serverUji.use(http.get('*/api/v1/sesi', () => new HttpResponse('Bad gateway', { status: 502 })))
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'SERVER', status: 502 })
  })
  it('respons yang tidak sesuai skema ditolak', async () => {
    serverUji.use(http.get('*/api/v1/uji', () => HttpResponse.json({ salah: true })))
    await expect(panggilApi('GET', '/uji', { skema: z.object({ benar: z.boolean() }) })).rejects.toThrow()
  })
})

describe('unggah berkas (2A-3)', () => {
  it('FormData dikirim apa adanya: tanpa Content-Type JSON, berkas sampai ke server', async () => {
    let jenis: string | null = null
    let nama: string | null = null
    serverUji.use(
      http.post('*/api/v1/uji-unggah', async ({ request }) => {
        jenis = request.headers.get('Content-Type')
        const berkas = (await request.formData()).get('berkas')
        nama = berkas instanceof File ? berkas.name : null
        return HttpResponse.json({ ok: true })
      }),
    )
    const isi = new FormData()
    isi.append('berkas', new File(['a;b'], 'data.csv', { type: 'text/csv' }))
    await panggilApi('POST', '/uji-unggah', { skema: z.object({ ok: z.boolean() }), body: isi })
    expect(jenis).toMatch(/^multipart\/form-data; boundary=/)
    expect(nama).toBe('data.csv')
  })
})
