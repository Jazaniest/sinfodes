// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { muatDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { penyimpananMemori } from '@/mocks/penyimpanan'
import { aturTokenSesi, panggilApi, SESI_KUKI } from './client'
import { GalatApi } from './galat'
import { daftarPenduduk } from './penduduk'
import { masukKabupaten } from './kabupaten'
import { masukKonsol } from './konsol'
import { ambilSesi, masuk } from './sesi'
import { masukWarga } from './warga'

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

describe('penanda sesi cookie (mode nyata, SPEC-V0.3 §8.1)', () => {
  const tangkapOtorisasi = () => {
    const hasil: { nilai: string | null | 'belum dipanggil' } = { nilai: 'belum dipanggil' }
    serverUji.use(
      http.get('*/api/v1/uji-otorisasi', ({ request }) => {
        hasil.nilai = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    return hasil
  }
  const skemaOk = z.object({ ok: z.boolean() })

  it('token bernilai SESI_KUKI tidak dikirim sebagai Authorization: sesi hidup di cookie, bukan di skrip', async () => {
    const otorisasi = tangkapOtorisasi()
    aturTokenSesi(SESI_KUKI)
    await panggilApi('GET', '/uji-otorisasi', { skema: skemaOk })
    expect(otorisasi.nilai).toBeNull()
  })

  it('token lain tetap dikirim sebagai Bearer', async () => {
    const otorisasi = tangkapOtorisasi()
    aturTokenSesi('demo.pgn_rosmiati')
    await panggilApi('GET', '/uji-otorisasi', { skema: skemaOk })
    expect(otorisasi.nilai).toBe('Bearer demo.pgn_rosmiati')
  })

  it('masuk dengan jawaban tanpa token memberi penanda kuki; jawaban dengan token membawanya apa adanya', async () => {
    const sesi = (await masuk(OPERATOR, 'demo')).sesi
    serverUji.use(http.post('*/api/v1/sesi/masuk', () => HttpResponse.json({ sesi })))
    expect((await masuk(OPERATOR, 'demo')).token).toBe(SESI_KUKI)
    serverUji.use(http.post('*/api/v1/sesi/masuk', () => HttpResponse.json({ token: 'demo.pgn_rosmiati', sesi })))
    expect((await masuk(OPERATOR, 'demo')).token).toBe('demo.pgn_rosmiati')
  })
})

describe('penanda sesi cookie untuk warga, Konsol, dan kabupaten', () => {
  it('jawaban masuk tanpa token memberi penanda kuki; dengan token membawanya apa adanya', async () => {
    const warga = (await masukWarga('1405095203918002', '246810')).sesi
    const konsol = (await masukKonsol('dina@sinfodes.id', 'demo')).sesi
    const kabupaten = (await masukKabupaten('admin.pelalawan@demo.sinfodes.id', 'demo')).sesi
    serverUji.use(
      http.post('*/api/v1/warga/masuk', () => HttpResponse.json({ sesi: warga })),
      http.post('*/api/v1/konsol/sesi/masuk', () => HttpResponse.json({ sesi: konsol })),
      http.post('*/api/v1/kabupaten/sesi/masuk', () => HttpResponse.json({ sesi: kabupaten })),
    )
    expect((await masukWarga('1405095203918002', '246810')).token).toBe(SESI_KUKI)
    expect((await masukKonsol('dina@sinfodes.id', 'demo')).token).toBe(SESI_KUKI)
    expect((await masukKabupaten('admin.pelalawan@demo.sinfodes.id', 'demo')).token).toBe(SESI_KUKI)
    serverUji.use(http.post('*/api/v1/konsol/sesi/masuk', () => HttpResponse.json({ token: 'konsol.kns_dina', sesi: konsol })))
    expect((await masukKonsol('dina@sinfodes.id', 'demo')).token).toBe('konsol.kns_dina')
  })

  it('masukKonsol mengirim kodeTotp hanya bila diisi', async () => {
    const badan: unknown[] = []
    const konsol = (await masukKonsol('dina@sinfodes.id', 'demo')).sesi
    serverUji.use(
      http.post('*/api/v1/konsol/sesi/masuk', async ({ request }) => {
        badan.push(await request.json())
        return HttpResponse.json({ sesi: konsol })
      }),
    )
    await masukKonsol('dina@sinfodes.id', 'demo')
    await masukKonsol('dina@sinfodes.id', 'demo', '012345')
    expect(badan).toEqual([{ email: 'dina@sinfodes.id', kataSandi: 'demo' }, { email: 'dina@sinfodes.id', kataSandi: 'demo', kodeTotp: '012345' }])
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

describe('kunci idempotensi (SPEC-V0.3 §5.4 butir 4)', () => {
  it('Idempotency-Key dikirim hanya bila diberikan', async () => {
    const terlihat: (string | null)[] = []
    serverUji.use(
      http.post('*/api/v1/uji-kunci', ({ request }) => {
        terlihat.push(request.headers.get('Idempotency-Key'))
        return HttpResponse.json({ ok: true })
      }),
    )
    const skema = z.object({ ok: z.boolean() })
    await panggilApi('POST', '/uji-kunci', { skema, body: {} })
    await panggilApi('POST', '/uji-kunci', { skema, body: {}, kunciIdempotensi: 'kunci-uji-0001' })
    expect(terlihat).toEqual([null, 'kunci-uji-0001'])
  })
})
