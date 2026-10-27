import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilMasukKonsolSchema, sesiKonsolSchema } from '@sinfodes/kontrak/konsol/schema'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buatAkunKonsolUji, type AkunKonsolUji } from '../../../test/akun-uji'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, kukiDariJawaban, rakitApp } from '../../../test/rakit-app'
import * as kataSandi from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { hashToken } from '../../kripto/token'
import { keBase32, kodeTotp, langkahDari } from '../../kripto/totp'

const AWAL = new Date('2026-09-24T02:00:00Z')
const KONSOL = 'http://konsol.sinfodes.localhost'
const EMAIL_DINA = 'dina@sinfodes.id'
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

const masuk = (app: App, badan: { email: string; kataSandi: string; kodeTotp?: string }, ip = '10.60.0.1', basis = KONSOL) =>
  kirimJson(app, basis, '/api/v1/konsol/sesi/masuk', badan, null, { 'X-Uji-Ip': ip })
const kodePada = (akun: AkunKonsolUji, waktu: Date) => kodeTotp(akun.rahasia as Buffer, langkahDari(waktu))

describe('POST /konsol/sesi/masuk (SPEC-V0.3 §8.4)', () => {
  it('akun semai tanpa TOTP masuk di lingkungan uji: sesi tanpa token, cookie __Host-konsol, hash di basis data, jejak audit platform', async () => {
    const { app } = rakit()
    const res = await masuk(app, { email: EMAIL_DINA, kataSandi: 'demo' })
    expect(res.status).toBe(200)
    const mentah = (await res.json()) as Record<string, unknown>
    expect(mentah).not.toHaveProperty('token')
    expect(hasilMasukKonsolSchema.parse(mentah).sesi).toEqual({ jenis: 'konsol', pengguna: { id: 'kns_dina', nama: 'Dina', jabatan: 'Tim Sinfodes', peran: 'tim', email: EMAIL_DINA } })
    const kuki = kukiDariJawaban(res) as string
    expect(kuki).toMatch(/^__Host-konsol=[A-Za-z0-9_-]{43}$/)
    const atribut = res.headers.getSetCookie()[0]
    for (const a of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(atribut).toContain(a)
    expect(atribut).not.toMatch(/Domain=/i)
    const token = kuki.split('=')[1]
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_konsol where token_hash = ${hashToken(token)}`)[0].n).toBe(1)
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_konsol where token_hash = ${token}`)[0].n).toBe(0)
    const audit = await uji.sqlMigrasi`select jenis, pelaku, ringkasan from jejak_audit_platform where jenis = 'konsol.masuk.berhasil' and pelaku = 'kns_dina'`
    expect(audit.length).toBeGreaterThan(0)
    expect(JSON.stringify(audit)).not.toContain(EMAIL_DINA)
  })

  it('hanya di alamat Konsol: desa, induk, dan kabupaten menjawab NOT_FOUND', async () => {
    const { app } = rakit()
    for (const basis of ['http://sungaisialang.sinfodes.localhost', 'http://sinfodes.localhost', 'http://kab-pelalawan.sinfodes.localhost']) {
      const res = await masuk(app, { email: EMAIL_DINA, kataSandi: 'demo' }, '10.60.1.1', basis)
      expect(res.status, basis).toBe(404)
      expect(galatSchema.parse(await res.json()).error.message).toBe('Konsol tidak ada di alamat ini.')
    }
  })

  it('email tak dikenal, kata sandi salah, akun nonaktif, akun kabupaten, dan akun panel desa menjawab identik, satu argon2 masing-masing (Review Focus 2)', async () => {
    const asli = vi.spyOn(kataSandi, 'periksaKataSandi')
    const palsu = vi.spyOn(kataSandi, 'periksaTerhadapPalsu')
    const { app } = rakit()
    const nonaktif = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: false, aktif: false })
    const kasus: [string, string, string][] = [
      ['tak dikenal', 'siapa@sinfodes.id', 'demo'],
      ['kata sandi salah', EMAIL_DINA, 'salah'],
      ['nonaktif', nonaktif.email, nonaktif.kataSandi],
      ['akun kabupaten', 'admin.pelalawan@demo.sinfodes.id', 'demo'],
      ['akun panel desa', 'rosmiati@sungaisialang.desa.id', 'demo'],
    ]
    for (const [i, [nama, email, sandi]] of kasus.entries()) {
      const sebelum = asli.mock.calls.length + palsu.mock.calls.length
      const res = await masuk(app, { email, kataSandi: sandi }, `10.61.0.${i}`)
      expect(res.status, nama).toBe(422)
      expect(res.headers.getSetCookie(), nama).toHaveLength(0)
      expect(await res.json(), nama).toEqual(BADAN_GAGAL)
      expect(asli.mock.calls.length + palsu.mock.calls.length - sebelum, nama).toBe(1)
    }
  })

  it('TOTP (Review Focus 4): tanpa kode, kode salah, kode lama, dan kode bukan enam angka menjawab sama dengan kata sandi salah; kode benar berhasil', async () => {
    const akun = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: true })
    const { app } = rakit({ waktu: () => AWAL })
    const benar = kodePada(akun, AWAL)
    const lama = kodePada(akun, new Date(AWAL.getTime() - 5 * 30_000))
    const salah = benar === '000000' ? '000001' : '000000'
    // Empat kegagalan (kelima akan mengunci akun); bentuk '12345' diperiksa sesudah kunci dibersihkan.
    for (const [i, kode] of [undefined, salah, lama, 'abcdef'].entries()) {
      const res = await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: kode }, `10.62.0.${i}`)
      expect(res.status, String(kode)).toBe(422)
      expect(res.headers.getSetCookie()).toHaveLength(0)
      expect(await res.json(), String(kode)).toEqual(BADAN_GAGAL)
    }
    await uji.sqlMigrasi`delete from kunci_masuk_platform`
    const pendek = await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: '12345' }, '10.62.0.9')
    expect(pendek.status).toBe(422)
    expect(await pendek.json()).toEqual(BADAN_GAGAL)
    const ok = await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: benar }, '10.62.1.1')
    expect(ok.status).toBe(200)
    expect(sesiKonsolSchema.parse((await ok.json() as { sesi: unknown }).sesi).pengguna.id).toBe(akun.id)
    const [b] = await uji.sqlMigrasi`select totp_langkah_terakhir from pengguna_konsol where id = ${akun.id}`
    expect(Number(b.totp_langkah_terakhir)).toBe(langkahDari(AWAL))
  })

  it('kode yang sama tidak bisa dipakai dua kali, langkah berikutnya diterima, dan kode benar dengan kata sandi salah tidak menghabiskan langkah', async () => {
    const akun = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: true })
    let sekarang = AWAL
    const { app } = rakit({ waktu: () => sekarang })
    const kode = kodePada(akun, AWAL)
    const salahSandi = await masuk(app, { email: akun.email, kataSandi: 'salah', kodeTotp: kode }, '10.63.0.1')
    expect(salahSandi.status).toBe(422)
    expect((await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: kode }, '10.63.0.2')).status).toBe(200)
    const ulang = await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: kode }, '10.63.0.3')
    expect(ulang.status).toBe(422)
    expect(await ulang.json()).toEqual(BADAN_GAGAL)
    sekarang = new Date(AWAL.getTime() + 30_000)
    expect((await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: kodePada(akun, sekarang) }, '10.63.0.4')).status).toBe(200)
  })

  it('lingkungan ketat (totpKonsolWajib): akun tanpa TOTP ditolak seragam walau kata sandi benar; akun ber-TOTP dengan kode tetap masuk', async () => {
    const akun = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: true })
    const { app } = rakit({ waktu: () => AWAL, ubahKonfigurasi: (k) => ({ ...k, totpKonsolWajib: true }) })
    const tanpa = await masuk(app, { email: EMAIL_DINA, kataSandi: 'demo' }, '10.64.0.1')
    expect(tanpa.status).toBe(422)
    expect(await tanpa.json()).toEqual(BADAN_GAGAL)
    expect((await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: kodePada(akun, AWAL) }, '10.64.0.2')).status).toBe(200)
  })

  it('akun yang sudah ber-TOTP wajib kode di lingkungan mana pun, juga di lingkungan longgar', async () => {
    const akun = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: true })
    const { app } = rakit({ waktu: () => AWAL })
    expect((await masuk(app, { email: akun.email, kataSandi: akun.kataSandi }, '10.64.1.1')).status).toBe(422)
  })

  it('rahasia TOTP tidak muncul di respons, log, atau jejak audit', async () => {
    const akun = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: true })
    const { app, baris } = rakit({ waktu: () => AWAL })
    const rahasia = akun.rahasia as Buffer
    const bocor = [keBase32(rahasia), rahasia.toString('base64'), rahasia.toString('hex')]
    const kode = kodePada(akun, AWAL)
    const gagal = await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: '000000' }, '10.65.0.1')
    const ok = await masuk(app, { email: akun.email, kataSandi: akun.kataSandi, kodeTotp: kode }, '10.65.0.2')
    const teks = [await gagal.text(), await ok.text(), baris.join('\n'), JSON.stringify(await uji.sqlMigrasi`select ringkasan from jejak_audit_platform`)].join('\n')
    for (const b of bocor) expect(teks).not.toContain(b)
    expect(baris.join('\n')).not.toContain(kode)
    expect(baris.join('\n')).not.toContain(akun.kataSandi)
  })

  it('lima gagal mengunci akun (RATE_LIMITED, juga untuk kata sandi benar), bertahan lewat aplikasi baru, sama untuk email yang tidak ada, buka sesudah 15 menit', async () => {
    let sekarang = AWAL
    for (const [email, benar] of [[EMAIL_DINA, 'demo'], ['hantu@sinfodes.id', 'demo']] as const) {
      for (let i = 0; i < 4; i++) expect((await masuk(rakit({ waktu: () => sekarang }).app, { email, kataSandi: 'salah' }, `10.66.${email === EMAIL_DINA ? 0 : 1}.${i}`)).status).toBe(422)
      const kelima = await masuk(rakit({ waktu: () => sekarang }).app, { email, kataSandi: 'salah' }, '10.66.9.1')
      expect(kelima.status).toBe(429)
      expect(galatSchema.parse(await kelima.json()).error.code).toBe('RATE_LIMITED')
      expect((await masuk(rakit({ waktu: () => sekarang }).app, { email, kataSandi: benar }, '10.66.9.2')).status).toBe(429)
    }
    sekarang = new Date(AWAL.getTime() + 15 * 60_000 + 1000)
    expect((await masuk(rakit({ waktu: () => sekarang }).app, { email: EMAIL_DINA, kataSandi: 'demo' }, '10.66.9.3')).status).toBe(200)
  })

  it('isian tidak valid, terlalu panjang, tanpa Origin, dan dibatasi per IP', async () => {
    const { app } = rakit()
    const kosong = await kirimJson(app, KONSOL, '/api/v1/konsol/sesi/masuk', { email: '', kataSandi: '' })
    expect(kosong.status).toBe(422)
    expect(galatSchema.parse(await kosong.json()).error.message).toBe('Email dan kata sandi wajib diisi.')
    const panjang = await kirimJson(app, KONSOL, '/api/v1/konsol/sesi/masuk', { email: `${'a'.repeat(300)}@x.id`, kataSandi: 'demo' })
    expect(galatSchema.parse(await panjang.json()).error.message).toBe('Isian terlalu panjang.')
    const tanpaAsal = await app.fetch(new Request(`${KONSOL}/api/v1/konsol/sesi/masuk`, { method: 'POST', body: JSON.stringify({ email: EMAIL_DINA, kataSandi: 'demo' }) }))
    expect(tanpaAsal.status).toBe(403)
    for (let i = 0; i < 5; i++) await masuk(app, { email: `x${i}@sinfodes.id`, kataSandi: 'salah' }, '10.67.0.1')
    expect((await masuk(app, { email: EMAIL_DINA, kataSandi: 'demo' }, '10.67.0.1')).status).toBe(429)
  })
})

describe('GET /konsol/sesi dan POST /konsol/sesi/keluar', () => {
  it('sesi hanya sah di alamat Konsol; keluar mencabut dan menghapus cookie; masuk ulang mencabut sesi lama; keluar tanpa sesi tetap 204', async () => {
    const { app } = rakit()
    const kuki = kukiDariJawaban(await masuk(app, { email: EMAIL_DINA, kataSandi: 'demo' }, '10.68.0.1')) as string
    expect((await ambil(app, `${KONSOL}/api/v1/konsol/sesi`)).status).toBe(401)
    expect((await ambil(app, 'http://sungaisialang.sinfodes.localhost/api/v1/konsol/sesi', kuki)).status).toBe(401)
    const ok = await ambil(app, `${KONSOL}/api/v1/konsol/sesi`, kuki)
    expect(ok.status).toBe(200)
    expect(sesiKonsolSchema.parse(await ok.json()).pengguna.id).toBe('kns_dina')
    const ulang = await kirimJson(app, KONSOL, '/api/v1/konsol/sesi/masuk', { email: EMAIL_DINA, kataSandi: 'demo' }, kuki)
    expect(ulang.status).toBe(200)
    expect((await ambil(app, `${KONSOL}/api/v1/konsol/sesi`, kuki)).status).toBe(401)
    const baru = kukiDariJawaban(ulang) as string
    const keluar = await kirimJson(app, KONSOL, '/api/v1/konsol/sesi/keluar', {}, baru)
    expect(keluar.status).toBe(204)
    expect(keluar.headers.getSetCookie()[0]).toMatch(/^__Host-konsol=;.*Max-Age=0/)
    expect((await ambil(app, `${KONSOL}/api/v1/konsol/sesi`, baru)).status).toBe(401)
    expect((await uji.sqlMigrasi`select dicabut from sesi_konsol where token_hash = ${hashToken(baru.split('=')[1])}`)[0].dicabut).not.toBeNull()
    expect((await kirimJson(app, KONSOL, '/api/v1/konsol/sesi/keluar', {})).status).toBe(204)
  })
})

describe('log (Review Focus 4)', () => {
  it('log masuk Konsol tidak memuat kata sandi, kode TOTP, email, atau cookie', async () => {
    const { app, baris } = rakit()
    await masuk(app, { email: 'rahasia-konsol@sinfodes.id', kataSandi: 'Sandi-Unik-Konsol-99', kodeTotp: '246802' }, '10.69.0.1')
    const kuki = kukiDariJawaban(await masuk(app, { email: EMAIL_DINA, kataSandi: 'demo' }, '10.69.0.2')) as string
    await ambil(app, `${KONSOL}/api/v1/konsol/sesi`, kuki)
    const semua = baris.join('\n')
    for (const rahasia of ['Sandi-Unik-Konsol-99', '246802', 'rahasia-konsol@', kuki.split('=')[1]]) expect(semua).not.toContain(rahasia)
  })
})
