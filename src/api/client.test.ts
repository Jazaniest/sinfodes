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
  aturTokenSesi(null, 'warga')
})
afterAll(() => serverUji.close())

describe('panggilApi', () => {
  it('masuk lalu memakai token untuk memanggil API', async () => {
    const { token, sesi } = await masuk(OPERATOR, 'demo')
    expect(sesi.pengguna.peran).toBe('operator')
    aturTokenSesi(token)
    expect((await ambilSesi()).desa.slug).toBe('sungaisialang')
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
  it('sesi null (website publik): token panel admin dan token warga tidak ikut terkirim', async () => {
    aturTokenSesi('demo.pgn_rosmiati')
    aturTokenSesi('warga.pdk_siti_rahmah', 'warga')
    let otorisasi: string | null = 'belum dipanggil'
    serverUji.use(
      http.get('*/api/v1/uji-publik', ({ request }) => {
        otorisasi = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await panggilApi('GET', '/uji-publik', { skema: z.object({ ok: z.boolean() }), sesi: null })
    expect(otorisasi).toBeNull()
  })
})

describe('skema dimuat malas', () => {
  it('skema berupa fungsi dimuat saat panggilan, bukan saat didefinisikan, lalu dipakai memvalidasi', async () => {
    serverUji.use(http.get('*/api/v1/uji-malas', () => HttpResponse.json({ ok: true })))
    let dimuat = 0
    const skema = () => {
      dimuat++
      return Promise.resolve(z.object({ ok: z.boolean() }))
    }
    expect(dimuat).toBe(0)
    expect(await panggilApi('GET', '/uji-malas', { skema })).toEqual({ ok: true })
    expect(dimuat).toBe(1)
  })
  it('respons yang tidak sesuai skema malas ditolak, dan galat HTTP tetap menjadi GalatApi', async () => {
    serverUji.use(
      http.get('*/api/v1/uji-malas', () => HttpResponse.json({ salah: true })),
      http.get('*/api/v1/uji-malas-galat', () => HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Tidak ada.' } }, { status: 404 })),
    )
    const skema = () => Promise.resolve(z.object({ ok: z.boolean() }))
    await expect(panggilApi('GET', '/uji-malas', { skema })).rejects.toThrow()
    await expect(panggilApi('GET', '/uji-malas-galat', { skema })).rejects.toMatchObject({ kode: 'NOT_FOUND', status: 404 })
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

describe('token per bagian (4A)', () => {
  it('permintaan warga memakai token warga; permintaan lain memakai token admin (fokus review 1)', async () => {
    const terlihat: (string | null)[] = []
    serverUji.use(
      http.get('*/api/v1/uji-token', ({ request }) => {
        terlihat.push(request.headers.get('Authorization'))
        return HttpResponse.json({ ok: true })
      }),
    )
    const skema = z.object({ ok: z.boolean() })
    aturTokenSesi('demo.pgn_rosmiati')
    aturTokenSesi('warga.pdk_siti_rahmah', 'warga')
    await panggilApi('GET', '/uji-token', { skema })
    await panggilApi('GET', '/uji-token', { skema, sesi: 'warga' })
    aturTokenSesi(null)
    await panggilApi('GET', '/uji-token', { skema, sesi: 'warga' })
    await panggilApi('GET', '/uji-token', { skema })
    expect(terlihat).toEqual(['Bearer demo.pgn_rosmiati', 'Bearer warga.pdk_siti_rahmah', 'Bearer warga.pdk_siti_rahmah', null])
  })
})
