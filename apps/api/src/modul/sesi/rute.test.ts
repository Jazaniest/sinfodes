import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilMasukSchema, sesiAdminSchema } from '@sinfodes/kontrak/pengguna/schema'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buatDbUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, kukiDariJawaban, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import * as kataSandi from '../../kripto/kata-sandi'
import { hashToken } from '../../kripto/token'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const EMAIL_OPERATOR = 'rosmiati@sungaisialang.desa.id'
const PESAN_GAGAL = 'Email atau kata sandi salah.'
const BADAN_GAGAL = { error: { code: 'VALIDATION', message: PESAN_GAGAL, fields: { kataSandi: PESAN_GAGAL } } }

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterEach(async () => {
  await uji.sqlMigrasi`delete from kunci_masuk_desa`
})
afterAll(async () => {
  await uji?.tutup()
})
const rakit = (opsi: Parameters<typeof rakitApp>[0] = {}) => rakitApp({ klien: uji.klien, ...opsi })

describe('POST /sesi/masuk', () => {
  it('berhasil di alamat desa akun: sesi lengkap tanpa token, dan cookie panel dengan atribut yang benar', async () => {
    const { app } = rakit()
    const { res, kuki } = await masukLewatRute(app, SS, EMAIL_OPERATOR)
    expect(res.status).toBe(200)
    const mentah = (await res.json()) as Record<string, unknown>
    expect(mentah).not.toHaveProperty('token')
    const isi = hasilMasukSchema.parse(mentah)
    expect(isi.sesi).toMatchObject({ jenis: 'admin', pengguna: { id: 'pgn_rosmiati', peran: 'operator' }, desa: { id: 'desa_sungai_sialang', slug: 'sungaisialang' } })
    expect(isi.sesi.dusun.map((d) => d.nomor)).toEqual([1, 2, 3, 4])
    expect(isi.sesi.modul).toEqual({ kesehatan: true })
    expect(isi.sesi.tampilanPanel?.warnaAksen).toMatch(/^#/)
    expect(kuki).toMatch(/^__Host-panel=[A-Za-z0-9_-]{43}$/)
    const atribut = res.headers.getSetCookie()[0]
    expect(atribut).toContain('HttpOnly')
    expect(atribut).toContain('Secure')
    expect(atribut).toContain('SameSite=Lax')
    expect(atribut).toContain('Path=/')
    expect(atribut).not.toMatch(/Domain=/i)
  })

  it('setiap masuk menerbitkan token dan ID sesi baru; basis data menyimpan hash, bukan token', async () => {
    const { app } = rakit()
    const a = await masukLewatRute(app, SS, EMAIL_OPERATOR)
    const b = await masukLewatRute(app, SS, EMAIL_OPERATOR)
    expect(a.kuki).not.toBe(b.kuki)
    const token = (a.kuki as string).split('=')[1]
    const baris = await uji.sqlMigrasi`select id, token_hash, jenis from sesi where token_hash = ${hashToken(token)}`
    expect(baris).toHaveLength(1)
    expect(baris[0].jenis).toBe('panel')
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi where token_hash = ${token}`)[0].n).toBe(0)
  })

  it('masuk dengan cookie sesi lama mencabut sesi lama (tidak ada dua sesi hidup dari satu peramban)', async () => {
    const { app } = rakit()
    const a = await masukLewatRute(app, SS, EMAIL_OPERATOR)
    const res = await kirimJson(app, SS, '/api/v1/sesi/masuk', { email: EMAIL_OPERATOR, kataSandi: 'demo' }, a.kuki)
    expect(res.status).toBe(200)
    expect((await ambil(app, `${SS}/api/v1/sesi`, a.kuki)).status).toBe(401)
    expect((await ambil(app, `${SS}/api/v1/sesi`, kukiDariJawaban(res))).status).toBe(200)
  })

  it('mencatat masuk.berhasil di jejak audit tanpa email atau kata sandi', async () => {
    const { app } = rakit()
    await masukLewatRute(app, SS, 'hendri@sungaisialang.desa.id')
    const baris = await uji.sqlMigrasi`select desa_id, jenis, pelaku, ringkasan from jejak_audit where jenis = 'masuk.berhasil' and pelaku = 'pgn_hendri'`
    expect(baris.length).toBeGreaterThan(0)
    expect(baris[0]).toMatchObject({ desa_id: 'desa_sungai_sialang', jenis: 'masuk.berhasil', pelaku: 'pgn_hendri' })
    const teks = JSON.stringify(baris)
    expect(teks).not.toContain('hendri@sungaisialang.desa.id')
    expect(teks).not.toContain('demo')
  })

  it('email tak dikenal, kata sandi salah, akun nonaktif, dan akun desa lain dengan kata sandi benar menjawab identik dan tanpa cookie', async () => {
    const { app } = rakit()
    await uji.sqlMigrasi`update pengguna set aktif = false where id = 'pgn_nurhayati'`
    try {
      const kasus: [string, string, string][] = [
        ['tak dikenal', 'siapa-ini@sungaisialang.desa.id', 'demo'],
        ['kata sandi salah', EMAIL_OPERATOR, 'salah-sekali'],
        ['nonaktif', 'nurhayati@sungaisialang.desa.id', 'demo'],
        ['akun desa lain', 'operator@tanjunglamo.desa.id', 'demo'],
      ]
      const jawaban: unknown[] = []
      for (const [i, [nama, email, sandi]] of kasus.entries()) {
        const { res } = await masukLewatRute(app, SS, email, sandi, `10.1.0.${i}`)
        expect(res.status, nama).toBe(422)
        expect(res.headers.getSetCookie(), nama).toHaveLength(0)
        jawaban.push(await res.json())
      }
      for (const j of jawaban) expect(j).toEqual(BADAN_GAGAL)
    } finally {
      await uji.sqlMigrasi`update pengguna set aktif = true where id = 'pgn_nurhayati'`
    }
  })

  it('setiap kegagalan menjalankan tepat satu verifikasi argon2, ada akunnya atau tidak', async () => {
    const asli = vi.spyOn(kataSandi, 'periksaKataSandi')
    const palsu = vi.spyOn(kataSandi, 'periksaTerhadapPalsu')
    const { app } = rakit()
    const hitung = () => asli.mock.calls.length + palsu.mock.calls.length
    let sebelum = hitung()
    for (const [i, [email, sandi]] of [
      ['siapa-ini@sungaisialang.desa.id', 'demo'],
      [EMAIL_OPERATOR, 'salah-sekali'],
      ['operator@tanjunglamo.desa.id', 'demo'],
    ].entries()) {
      await masukLewatRute(app, SS, email, sandi, `10.2.0.${i}`)
      expect(hitung() - sebelum, email).toBe(1)
      sebelum = hitung()
    }
  })

  it('waktu jawaban akun tak dikenal sebanding dengan kata sandi salah (rasio di bawah 3)', async () => {
    const { app } = rakit()
    await masukLewatRute(app, SS, EMAIL_OPERATOR, 'pemanasan', '10.3.0.0') // memanaskan hash palsu dan kolam
    const rata = async (email: string, ip: string) => {
      const t0 = performance.now()
      for (let i = 0; i < 3; i++) await masukLewatRute(app, SS, email, 'salah-sekali', `${ip}${i}`)
      return (performance.now() - t0) / 3
    }
    const tak = await rata('siapa-ini@sungaisialang.desa.id', '10.3.1.')
    const salah = await rata(EMAIL_OPERATOR, '10.3.2.')
    expect(Math.max(tak, salah) / Math.min(tak, salah)).toBeLessThan(3)
  })

  it('kegagalan dicatat sebagai masuk.gagal dengan indeks email, bukan email polos', async () => {
    const { app } = rakit()
    await masukLewatRute(app, SS, 'penebak@sungaisialang.desa.id', 'demo', '10.4.0.1')
    const baris = await uji.sqlMigrasi`select jenis, pelaku, ringkasan from jejak_audit where jenis = 'masuk.gagal' order by waktu desc limit 1`
    expect(baris[0].pelaku).toBeNull()
    expect(baris[0].ringkasan.emailIndeks).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(JSON.stringify(baris[0])).not.toContain('penebak@')
  })

  it('isian kosong atau bukan JSON: 422 tanpa memeriksa kata sandi', async () => {
    const { app } = rakit()
    const kosong = await kirimJson(app, SS, '/api/v1/sesi/masuk', { email: '', kataSandi: '' })
    expect(kosong.status).toBe(422)
    expect(galatSchema.parse(await kosong.json()).error.message).toBe('Email dan kata sandi wajib diisi.')
    const rusak = await app.fetch(new Request(`${SS}/api/v1/sesi/masuk`, { method: 'POST', headers: { Origin: SS }, body: 'bukan json' }))
    expect(rusak.status).toBe(422)
  })

  it('isian yang terlalu panjang ditolak 422 sebelum verifikasi argon2, dan tidak memenuhi memori pembatas laju', async () => {
    const asli = vi.spyOn(kataSandi, 'periksaKataSandi')
    const palsu = vi.spyOn(kataSandi, 'periksaTerhadapPalsu')
    const { app } = rakit()
    const panjangEmail = await kirimJson(app, SS, '/api/v1/sesi/masuk', { email: `${'a'.repeat(300)}@sungaisialang.desa.id`, kataSandi: 'demo' }, null, { 'X-Uji-Ip': '10.8.0.1' })
    expect(panjangEmail.status).toBe(422)
    expect(galatSchema.parse(await panjangEmail.json()).error.message).toBe('Isian terlalu panjang.')
    const panjangSandi = await kirimJson(app, SS, '/api/v1/sesi/masuk', { email: EMAIL_OPERATOR, kataSandi: 'x'.repeat(2000) }, null, { 'X-Uji-Ip': '10.8.0.2' })
    expect(panjangSandi.status).toBe(422)
    expect(asli.mock.calls.length + palsu.mock.calls.length).toBe(0)
  })

  it('masuk tanpa Origin sama ditolak FORBIDDEN, dan di alamat selain desa menjawab NOT_FOUND', async () => {
    const { app } = rakit()
    const tanpaAsal = await app.fetch(new Request(`${SS}/api/v1/sesi/masuk`, { method: 'POST', body: JSON.stringify({ email: EMAIL_OPERATOR, kataSandi: 'demo' }) }))
    expect(tanpaAsal.status).toBe(403)
    const induk = await masukLewatRute(app, 'http://sinfodes.localhost', EMAIL_OPERATOR)
    expect(induk.res.status).toBe(404)
  })

  it('batas laju: lima kegagalan dari satu IP dalam semenit, lalu RATE_LIMITED bahkan untuk kata sandi benar; IP lain tidak terkena', async () => {
    let sekarang = new Date('2026-09-24T02:00:00Z')
    const { app } = rakit({ waktu: () => sekarang })
    for (let i = 0; i < 5; i++) expect((await masukLewatRute(app, SS, `penebak${i}@sungaisialang.desa.id`, 'x', '10.5.0.1')).res.status).toBe(422)
    const terbatas = await masukLewatRute(app, SS, EMAIL_OPERATOR, 'demo', '10.5.0.1')
    expect(terbatas.res.status).toBe(429)
    expect(galatSchema.parse(await terbatas.res.json()).error.code).toBe('RATE_LIMITED')
    expect(terbatas.res.headers.get('Retry-After')).toBe('60')
    expect((await masukLewatRute(app, SS, EMAIL_OPERATOR, 'demo', '10.5.0.2')).res.status).toBe(200)
    sekarang = new Date(sekarang.getTime() + 61_000)
    expect((await masukLewatRute(app, SS, EMAIL_OPERATOR, 'demo', '10.5.0.1')).res.status).toBe(200)
  })

  it('kunci per akun di PostgreSQL: lima gagal dari banyak IP mengunci akun, juga untuk kata sandi benar, sama untuk email yang tidak ada, bertahan lewat aplikasi baru', async () => {
    for (const email of [EMAIL_OPERATOR, 'hantu@sungaisialang.desa.id']) {
      for (let i = 0; i < 4; i++) expect((await masukLewatRute(rakit().app, SS, email, 'salah', `10.6.${email === EMAIL_OPERATOR ? 0 : 1}.${i}`)).res.status).toBe(422)
      const kelima = await masukLewatRute(rakit().app, SS, email, 'salah', '10.6.9.1')
      expect(kelima.res.status).toBe(429)
      expect(galatSchema.parse(await kelima.res.json()).error.code).toBe('RATE_LIMITED')
      expect((await masukLewatRute(rakit().app, SS, email, 'demo', '10.6.9.2')).res.status).toBe(429)
    }
    // Akun lain di desa yang sama, dan email yang sama di desa lain, tidak ikut terkunci.
    expect((await masukLewatRute(rakit().app, SS, 'hendri@sungaisialang.desa.id', 'demo', '10.6.9.3')).res.status).toBe(200)
  })

  it('kunci akun panel dibuka sesudah 15 menit dan berhasil masuk menghapus hitungan', async () => {
    let sekarang = new Date('2026-09-24T02:00:00Z')
    for (let i = 0; i < 5; i++) await masukLewatRute(rakit({ waktu: () => sekarang }).app, SS, EMAIL_OPERATOR, 'salah', `10.6.5.${i}`)
    sekarang = new Date(sekarang.getTime() + 15 * 60_000 + 1000)
    expect((await masukLewatRute(rakit({ waktu: () => sekarang }).app, SS, EMAIL_OPERATOR, 'demo', '10.6.5.9')).res.status).toBe(200)
    expect((await uji.sqlMigrasi`select count(*)::int as n from kunci_masuk_desa where jenis = 'panel'`)[0].n).toBe(0)
  })
})

describe('GET /sesi dan POST /sesi/keluar', () => {
  it('GET /sesi memberi sesi lengkap dengan cookie, dan 401 tanpa atau dengan cookie dari alamat lain', async () => {
    const { app } = rakit()
    const { kuki } = await masukLewatRute(app, SS, EMAIL_OPERATOR)
    const ok = await ambil(app, `${SS}/api/v1/sesi`, kuki)
    expect(ok.status).toBe(200)
    expect(sesiAdminSchema.parse(await ok.json()).pengguna.id).toBe('pgn_rosmiati')
    expect((await ambil(app, `${SS}/api/v1/sesi`)).status).toBe(401)
    expect((await ambil(app, `${TL}/api/v1/sesi`, kuki)).status).toBe(401)
    expect((await ambil(app, 'http://sinfodes.localhost/api/v1/sesi', kuki)).status).toBe(401)
  })

  it('keluar mencabut sesi: cookie yang sama lalu 401, cookie dihapus, dan basis data mencatat pencabutan', async () => {
    const { app } = rakit()
    const { kuki } = await masukLewatRute(app, SS, 'hendri@sungaisialang.desa.id')
    const keluar = await kirimJson(app, SS, '/api/v1/sesi/keluar', {}, kuki)
    expect(keluar.status).toBe(204)
    const hapus = keluar.headers.getSetCookie()[0]
    expect(hapus).toMatch(/^__Host-panel=;/)
    expect(hapus).toMatch(/Max-Age=0/)
    expect((await ambil(app, `${SS}/api/v1/sesi`, kuki)).status).toBe(401)
    const token = (kuki as string).split('=')[1]
    expect((await uji.sqlMigrasi`select dicabut from sesi where token_hash = ${hashToken(token)}`)[0].dicabut).not.toBeNull()
    expect((await kirimJson(app, SS, '/api/v1/sesi/keluar', {})).status).toBe(204)
  })
})

describe('log permintaan (Review Focus 4)', () => {
  it('tidak memuat kata sandi, token cookie, atau email dari isian masuk', async () => {
    const { app, baris } = rakit()
    await masukLewatRute(app, SS, 'rahasia-email@sungaisialang.desa.id', 'Sandi-Unik-Uji-77', '10.7.0.1')
    const { kuki } = await masukLewatRute(app, SS, EMAIL_OPERATOR, 'demo', '10.7.0.2')
    await ambil(app, `${SS}/api/v1/sesi`, kuki)
    const semua = baris.join('\n')
    expect(semua.length).toBeGreaterThan(0)
    expect(semua).not.toContain('Sandi-Unik-Uji-77')
    expect(semua).not.toContain('rahasia-email@')
    expect(semua).not.toContain((kuki as string).split('=')[1])
  })
})
