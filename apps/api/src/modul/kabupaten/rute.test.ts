import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilMasukKabupatenSchema, sesiKabupatenSchema } from '@sinfodes/kontrak/kabupaten/schema'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, kukiDariJawaban, rakitApp } from '../../../test/rakit-app'
import * as kataSandi from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { hashToken } from '../../kripto/token'

const AWAL = new Date('2026-09-24T02:00:00Z')
const PELALAWAN = 'http://kab-pelalawan.sinfodes.localhost'
const SIAK = 'http://kab-siak.sinfodes.localhost'
const EMAIL_FAJAR = 'admin.pelalawan@demo.sinfodes.id'
const PESAN_GAGAL = 'Email atau kata sandi salah.'
const BADAN_GAGAL = { error: { code: 'VALIDATION', message: PESAN_GAGAL, fields: { kataSandi: PESAN_GAGAL } } }

let uji: DbUji
let penyandi: Penyandi
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
})
afterEach(async () => {
  await uji.sqlMigrasi`delete from kunci_masuk_platform`
})
afterAll(async () => {
  await uji?.tutup()
})
const rakit = (opsi: Parameters<typeof rakitApp>[0] = {}) => rakitApp({ klien: uji.klien, penyandi, ...opsi })
type App = ReturnType<typeof rakit>['app']

const masuk = (app: App, email: string, sandi = 'demo', ip = '10.50.0.1', basis = PELALAWAN) =>
  kirimJson(app, basis, '/api/v1/kabupaten/sesi/masuk', { email, kataSandi: sandi }, null, { 'X-Uji-Ip': ip })

describe('POST /kabupaten/sesi/masuk (SPEC-V0.2 §8.1)', () => {
  it('Admin Pelalawan masuk di alamat kabupatennya: sesi tanpa token, cookie __Host-kab, hash di basis data, jejak audit platform', async () => {
    const { app } = rakit()
    const res = await masuk(app, EMAIL_FAJAR)
    expect(res.status).toBe(200)
    const mentah = (await res.json()) as Record<string, unknown>
    expect(mentah).not.toHaveProperty('token')
    const { sesi } = hasilMasukKabupatenSchema.parse(mentah)
    expect(sesi).toMatchObject({ jenis: 'kabupaten', kabupaten: { kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan' }, pengguna: { id: 'kab_fajar', peran: 'admin', aktif: true } })
    const kuki = kukiDariJawaban(res) as string
    expect(kuki).toMatch(/^__Host-kab=[A-Za-z0-9_-]{43}$/)
    const atribut = res.headers.getSetCookie()[0]
    for (const a of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(atribut).toContain(a)
    expect(atribut).not.toMatch(/Domain=/i)
    const token = kuki.split('=')[1]
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_kabupaten where token_hash = ${hashToken(token)}`)[0].n).toBe(1)
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_kabupaten where token_hash = ${token}`)[0].n).toBe(0)
    const audit = await uji.sqlMigrasi`select jenis, pelaku, ringkasan from jejak_audit_platform where jenis = 'kabupaten.masuk.berhasil' and pelaku = 'kab_fajar'`
    expect(audit.length).toBeGreaterThan(0)
    expect(JSON.stringify(audit)).not.toContain(EMAIL_FAJAR)
    const lagi = await ambil(app, `${PELALAWAN}/api/v1/kabupaten/sesi`, kuki)
    expect(lagi.status).toBe(200)
    expect(sesiKabupatenSchema.parse(await lagi.json()).kabupaten.label).toBe('kab-pelalawan')
  })

  it('email tak dikenal, kata sandi salah, akun nonaktif, dan akun kabupaten lain dengan kata sandi benar menjawab identik, satu argon2 masing-masing (Review Focus 2)', async () => {
    const asli = vi.spyOn(kataSandi, 'periksaKataSandi')
    const palsu = vi.spyOn(kataSandi, 'periksaTerhadapPalsu')
    const { app } = rakit()
    await uji.sqlMigrasi`update pengguna_kabupaten set aktif = false where id = 'kab_rosnani'`
    try {
      // Perbedaan sengaja: API tiruan memberi petunjuk `alamatKabupaten` untuk akun kabupaten lain; server nyata tidak.
      const kasus: [string, string, string, string, string][] = [
        ['tak dikenal', 'siapa@demo.sinfodes.id', 'demo', '10.51.0.1', PELALAWAN],
        ['kata sandi salah', EMAIL_FAJAR, 'salah', '10.51.0.2', PELALAWAN],
        ['nonaktif', 'pmd.pelalawan@demo.sinfodes.id', 'demo', '10.51.0.3', PELALAWAN],
        ['akun kabupaten lain', EMAIL_FAJAR, 'demo', '10.51.0.4', SIAK],
      ]
      for (const [nama, email, sandi, ip, basis] of kasus) {
        const sebelum = asli.mock.calls.length + palsu.mock.calls.length
        const res = await masuk(app, email, sandi, ip, basis)
        expect(res.status, nama).toBe(422)
        expect(res.headers.getSetCookie(), nama).toHaveLength(0)
        expect(await res.json(), nama).toEqual(BADAN_GAGAL)
        expect(asli.mock.calls.length + palsu.mock.calls.length - sebelum, nama).toBe(1)
      }
    } finally {
      await uji.sqlMigrasi`update pengguna_kabupaten set aktif = true where id = 'kab_rosnani'`
    }
  })

  it('kegagalan dicatat di jejak audit platform dengan indeks email, bukan email polos', async () => {
    const { app } = rakit()
    await masuk(app, 'penebak@demo.sinfodes.id', 'demo', '10.52.0.1')
    const indeks = penyandi.indeks('penebak@demo.sinfodes.id', ruang.emailKabupaten('14.05'))
    const [b] = await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit_platform where jenis = 'kabupaten.masuk.gagal' and ringkasan->>'emailIndeks' = ${indeks}`
    expect(b).toBeDefined()
    expect(b.pelaku).toBeNull()
    expect(JSON.stringify(b)).not.toContain('penebak@')
  })

  it('lima gagal mengunci akun (RATE_LIMITED, juga untuk kata sandi benar), bertahan lewat aplikasi baru, buka sesudah 15 menit', async () => {
    let sekarang = AWAL
    for (let i = 0; i < 4; i++) expect((await masuk(rakit({ waktu: () => sekarang }).app, EMAIL_FAJAR, 'salah', `10.53.0.${i}`)).status).toBe(422)
    const kelima = await masuk(rakit({ waktu: () => sekarang }).app, EMAIL_FAJAR, 'salah', '10.53.1.1')
    expect(kelima.status).toBe(429)
    expect(galatSchema.parse(await kelima.json()).error.code).toBe('RATE_LIMITED')
    expect((await masuk(rakit({ waktu: () => sekarang }).app, EMAIL_FAJAR, 'demo', '10.53.1.2')).status).toBe(429)
    // Email lain di kabupaten yang sama tidak ikut terkunci.
    expect((await masuk(rakit({ waktu: () => sekarang }).app, 'pmd.pelalawan@demo.sinfodes.id', 'demo', '10.53.1.3')).status).toBe(200)
    sekarang = new Date(AWAL.getTime() + 15 * 60_000 + 1000)
    expect((await masuk(rakit({ waktu: () => sekarang }).app, EMAIL_FAJAR, 'demo', '10.53.1.4')).status).toBe(200)
  })

  it('alamat selain kabupaten mitra tidak punya halaman masuk; isian tidak valid; tanpa Origin', async () => {
    const { app } = rakit()
    const bukanKab = await masuk(app, EMAIL_FAJAR, 'demo', '10.54.0.1', 'http://sungaisialang.sinfodes.localhost')
    expect(bukanKab.status).toBe(404)
    expect(galatSchema.parse(await bukanKab.json()).error.message).toBe('Dasbor kabupaten tidak ada di alamat ini.')
    const belumMitra = await masuk(app, EMAIL_FAJAR, 'demo', '10.54.0.2', 'http://kab-kampar.sinfodes.localhost')
    expect(belumMitra.status).toBe(404)
    expect(galatSchema.parse(await belumMitra.json()).error.message).toBe('Kabupaten ini belum memakai Sinfodes.')
    expect((await masuk(app, EMAIL_FAJAR, 'demo', '10.54.0.3', 'http://sinfodes.localhost')).status).toBe(404)
    const kosong = await kirimJson(app, PELALAWAN, '/api/v1/kabupaten/sesi/masuk', { email: '', kataSandi: '' })
    expect(kosong.status).toBe(422)
    expect(galatSchema.parse(await kosong.json()).error.message).toBe('Email dan kata sandi wajib diisi.')
    const panjang = await kirimJson(app, PELALAWAN, '/api/v1/kabupaten/sesi/masuk', { email: `${'a'.repeat(300)}@x.id`, kataSandi: 'demo' })
    expect(panjang.status).toBe(422)
    expect(galatSchema.parse(await panjang.json()).error.message).toBe('Isian terlalu panjang.')
    const tanpaAsal = await app.fetch(new Request(`${PELALAWAN}/api/v1/kabupaten/sesi/masuk`, { method: 'POST', body: JSON.stringify({ email: EMAIL_FAJAR, kataSandi: 'demo' }) }))
    expect(tanpaAsal.status).toBe(403)
  })

  it('email dinormalkan (huruf besar dan spasi) seperti API tiruan', async () => {
    const { app } = rakit()
    expect((await masuk(app, `  ${EMAIL_FAJAR.toUpperCase()} `, 'demo', '10.55.0.1')).status).toBe(200)
  })
})

describe('GET /kabupaten/sesi dan POST /kabupaten/sesi/keluar', () => {
  it('sesi hanya sah di alamat kabupatennya; keluar mencabut sesi dan menghapus cookie; keluar tanpa sesi tetap 204', async () => {
    const { app } = rakit()
    const kuki = kukiDariJawaban(await masuk(app, EMAIL_FAJAR, 'demo', '10.56.0.1')) as string
    expect((await ambil(app, `${PELALAWAN}/api/v1/kabupaten/sesi`)).status).toBe(401)
    expect((await ambil(app, `${SIAK}/api/v1/kabupaten/sesi`, kuki)).status).toBe(401)
    expect((await ambil(app, 'http://sungaisialang.sinfodes.localhost/api/v1/kabupaten/sesi', kuki)).status).toBe(401)
    const keluar = await kirimJson(app, PELALAWAN, '/api/v1/kabupaten/sesi/keluar', {}, kuki)
    expect(keluar.status).toBe(204)
    expect(keluar.headers.getSetCookie()[0]).toMatch(/^__Host-kab=;.*Max-Age=0/)
    expect((await ambil(app, `${PELALAWAN}/api/v1/kabupaten/sesi`, kuki)).status).toBe(401)
    const token = kuki.split('=')[1]
    expect((await uji.sqlMigrasi`select dicabut from sesi_kabupaten where token_hash = ${hashToken(token)}`)[0].dicabut).not.toBeNull()
    expect((await kirimJson(app, PELALAWAN, '/api/v1/kabupaten/sesi/keluar', {})).status).toBe(204)
  })

  it('masuk dengan cookie lama mencabut sesi lama', async () => {
    const { app } = rakit()
    const a = kukiDariJawaban(await masuk(app, EMAIL_FAJAR, 'demo', '10.56.1.1')) as string
    const res = await kirimJson(app, PELALAWAN, '/api/v1/kabupaten/sesi/masuk', { email: EMAIL_FAJAR, kataSandi: 'demo' }, a)
    expect(res.status).toBe(200)
    expect((await ambil(app, `${PELALAWAN}/api/v1/kabupaten/sesi`, a)).status).toBe(401)
  })
})

describe('log (Review Focus 4)', () => {
  it('log masuk kabupaten tidak memuat kata sandi, email, atau cookie', async () => {
    const { app, baris } = rakit()
    await masuk(app, 'rahasia-kab@demo.sinfodes.id', 'Sandi-Unik-Kab-88', '10.57.0.1')
    const kuki = kukiDariJawaban(await masuk(app, EMAIL_FAJAR, 'demo', '10.57.0.2')) as string
    await ambil(app, `${PELALAWAN}/api/v1/kabupaten/sesi`, kuki)
    const semua = baris.join('\n')
    for (const rahasia of ['Sandi-Unik-Kab-88', 'rahasia-kab@', kuki.split('=')[1]]) expect(semua).not.toContain(rahasia)
  })
})
