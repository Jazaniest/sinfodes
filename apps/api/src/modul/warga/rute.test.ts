import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilLupaPinSchema, hasilMasukWargaSchema, sesiWargaSchema } from '@sinfodes/kontrak/warga/sesi'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, kukiDariJawaban, rakitApp } from '../../../test/rakit-app'
import { hashKataSandi, periksaKataSandi } from '../../kripto/kata-sandi'
import * as kataSandi from '../../kripto/kata-sandi'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { hashToken } from '../../kripto/token'

const AWAL = new Date('2026-09-24T02:00:00Z')
const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const SITI = { nik: '1405095203918002', pin: '246810', id: 'pdk_siti_rahmah' }
const ZULKIFLI = { nik: '1405091706848005', pin: '135790', id: 'pdk_zulkifli' }
/** Kode wilayah Jakarta: pasti tidak terdaftar di desa demo. */
const NIK_ASING = '3171014101900001'
const PESAN_SALAH = 'NIK atau PIN salah.'
const BADAN_GAGAL = { error: { code: 'VALIDATION', message: PESAN_SALAH, fields: { pin: PESAN_SALAH } } }
const PESAN_TERKUNCI = 'Terlalu banyak percobaan — coba lagi 15 menit.'

let uji: DbUji
let penyandi: Penyandi
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
})
afterEach(async () => {
  await uji.sqlMigrasi`delete from kunci_masuk_desa`
})
afterAll(async () => {
  await uji?.tutup()
})
const rakit = (opsi: Parameters<typeof rakitApp>[0] = {}) => rakitApp({ klien: uji.klien, penyandi, ...opsi })
type App = ReturnType<typeof rakit>['app']

const masuk = (app: App, nik: string, pin: string, ip = '10.20.0.1', basis = SS) =>
  kirimJson(app, basis, '/api/v1/warga/masuk', { nik, pin }, null, { 'X-Uji-Ip': ip })
const masukBerhasil = async (app: App, ip = '10.20.0.1') => {
  const res = await masuk(app, SITI.nik, SITI.pin, ip)
  expect(res.status).toBe(200)
  return kukiDariJawaban(res) as string
}

describe('POST /warga/masuk (SPEC-V0.3 §8.5)', () => {
  it('berhasil: sesi lengkap tanpa token, cookie __Host-warga beratribut benar, hash di basis data, audit tanpa NIK atau PIN', async () => {
    const { app } = rakit()
    const res = await masuk(app, SITI.nik, SITI.pin)
    expect(res.status).toBe(200)
    const mentah = (await res.json()) as Record<string, unknown>
    expect(mentah).not.toHaveProperty('token')
    const { sesi } = hasilMasukWargaSchema.parse(mentah)
    expect(sesi).toMatchObject({
      jenis: 'warga',
      penduduk: { id: SITI.id, nama: 'Siti Rahmah', nik: SITI.nik, keluargaId: 'kk_syahrial' },
      desa: { nama: 'Sungai Sialang' },
      whatsapp: '081277402231',
    })
    const kuki = kukiDariJawaban(res) as string
    expect(kuki).toMatch(/^__Host-warga=[A-Za-z0-9_-]{43}$/)
    const atribut = res.headers.getSetCookie()[0]
    for (const a of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(atribut).toContain(a)
    expect(atribut).not.toMatch(/Domain=/i)
    const token = kuki.split('=')[1]
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_warga where token_hash = ${hashToken(token)}`)[0].n).toBe(1)
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_warga where token_hash = ${token}`)[0].n).toBe(0)
    const audit = await uji.sqlMigrasi`select jenis, pelaku, ringkasan from jejak_audit where jenis = 'warga.masuk.berhasil' and pelaku = ${SITI.id}`
    expect(audit.length).toBeGreaterThan(0)
    const teks = JSON.stringify(audit)
    expect(teks).not.toContain(SITI.nik)
    expect(teks).not.toContain(SITI.pin)
  })

  it('NIK tak dikenal, NIK desa lain, NIK yang bukan Hidup, dan PIN salah menjawab identik, tanpa cookie, satu verifikasi argon2 masing-masing (Review Focus 2)', async () => {
    const asli = vi.spyOn(kataSandi, 'periksaKataSandi')
    const palsu = vi.spyOn(kataSandi, 'periksaTerhadapPalsu')
    const { app } = rakit()
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Meninggal' where id = ${ZULKIFLI.id}`
    try {
      const kasus: [string, string, string, string, string][] = [
        ['PIN salah', SITI.nik, '111111', '10.21.0.1', SS],
        ['NIK tak dikenal', NIK_ASING, SITI.pin, '10.21.0.2', SS],
        ['bukan Hidup', ZULKIFLI.nik, ZULKIFLI.pin, '10.21.0.4', SS],
      ]
      for (const [nama, nik, pin, ip, basis] of kasus) {
        const sebelum = asli.mock.calls.length + palsu.mock.calls.length
        const res = await masuk(app, nik, pin, ip, basis)
        expect(res.status, nama).toBe(422)
        expect(res.headers.getSetCookie(), nama).toHaveLength(0)
        expect(await res.json(), nama).toEqual(BADAN_GAGAL)
        expect(asli.mock.calls.length + palsu.mock.calls.length - sebelum, nama).toBe(1)
      }
      // NIK warga desa lain di alamat ini: alamat Tanjung Lamo tidak punya penduduk itu; jawabannya sama, setelah lolos pemeriksaan Persiapan.
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = 'desa_tanjung_lamo'`
      try {
        const lain = await masuk(rakit().app, SITI.nik, SITI.pin, '10.21.0.5', TL)
        expect(lain.status).toBe(422)
        expect(await lain.json()).toEqual(BADAN_GAGAL)
      } finally {
        await uji.sqlMigrasi`update desa set status = 'Persiapan' where id = 'desa_tanjung_lamo'`
      }
      // Semua kegagalan tercatat di kunci, memakai indeks HMAC (bukan NIK polos).
      const baris = await uji.sqlMigrasi`select desa_id, kunci from kunci_masuk_desa where jenis = 'warga'`
      expect(baris.length).toBe(4)
      for (const b of baris) expect(b.kunci).toMatch(/^[A-Za-z0-9_-]{43}$/)
    } finally {
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = ${ZULKIFLI.id}`
    }
  })

  it('kegagalan dicatat sebagai warga.masuk.gagal dengan indeks NIK, bukan NIK polos', async () => {
    const { app } = rakit()
    await masuk(app, NIK_ASING, '000000', '10.22.0.1')
    const indeks = penyandi.indeks(NIK_ASING, ruang.nik('desa_sungai_sialang'))
    const [b] = await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit where jenis = 'warga.masuk.gagal' and ringkasan->>'nikIndeks' = ${indeks}`
    expect(b).toBeDefined()
    expect(b.pelaku).toBeNull()
    expect(b.ringkasan.alasan).toBe('tak-dikenal')
    expect(JSON.stringify(b)).not.toContain(NIK_ASING)
  })

  it('lima salah mengunci: pesan sisa, RATE_LIMITED juga untuk PIN benar dan NIK yang tidak ada, buka sesudah 15 menit, berhasil menghapus hitungan', async () => {
    let sekarang = AWAL
    const { app } = rakit({ waktu: () => sekarang })
    for (const [nik, benar] of [[SITI.nik, SITI.pin], [NIK_ASING, null]] as const) {
      const gagal = async (i: number) => (await masuk(app, nik, '000000', `10.23.${nik === SITI.nik ? 0 : 1}.${i}`)).json() as Promise<{ error: { code: string; message: string } }>
      expect((await gagal(1)).error.message).toBe(PESAN_SALAH)
      expect((await gagal(2)).error.message).toBe(PESAN_SALAH)
      expect((await gagal(3)).error.message).toBe(`${PESAN_SALAH} Sisa 2 kali percobaan sebelum dikunci 15 menit.`)
      expect((await gagal(4)).error.message).toBe(`${PESAN_SALAH} Sisa 1 kali percobaan sebelum dikunci 15 menit.`)
      const kelima = await masuk(app, nik, '000000', `10.23.9.${nik === SITI.nik ? 0 : 1}`)
      expect(kelima.status).toBe(429)
      expect(galatSchema.parse(await kelima.json()).error).toEqual({ code: 'RATE_LIMITED', message: PESAN_TERKUNCI })
      const sebelum = vi.spyOn(kataSandi, 'periksaKataSandi').mock.calls.length
      const saatTerkunci = await masuk(app, nik, benar ?? '000000', '10.23.8.1')
      expect(saatTerkunci.status).toBe(429)
      expect(vi.spyOn(kataSandi, 'periksaKataSandi').mock.calls.length, 'terkunci: tanpa argon2').toBe(sebelum)
    }
    sekarang = new Date(AWAL.getTime() + 15 * 60_000 + 1000)
    const buka = await masuk(app, SITI.nik, SITI.pin, '10.23.7.1')
    expect(buka.status).toBe(200)
    expect((await uji.sqlMigrasi`select count(*)::int as n from kunci_masuk_desa where jenis = 'warga'`)[0].n).toBe(1)
  })

  it('kunci bertahan lewat aplikasi baru (server dimulai ulang)', async () => {
    for (let i = 0; i < 5; i++) await masuk(rakit().app, SITI.nik, '000000', `10.24.0.${i}`)
    const res = await masuk(rakit().app, SITI.nik, SITI.pin, '10.24.1.1')
    expect(res.status).toBe(429)
  })

  it('desa Persiapan menjawab FORBIDDEN sebelum NIK diperiksa, untuk NIK mana pun, tanpa memanggil argon2 atau mencatat kunci', async () => {
    const asli = vi.spyOn(kataSandi, 'periksaKataSandi')
    const palsu = vi.spyOn(kataSandi, 'periksaTerhadapPalsu')
    const { app } = rakit()
    const res = await masuk(app, SITI.nik, SITI.pin, '10.25.0.1', TL)
    expect(res.status).toBe(403)
    expect(galatSchema.parse(await res.json()).error).toEqual({ code: 'FORBIDDEN', message: 'Layanan warga desa ini belum dibuka.' })
    expect(asli.mock.calls.length + palsu.mock.calls.length).toBe(0)
    expect((await uji.sqlMigrasi`select count(*)::int as n from kunci_masuk_desa`)[0].n).toBe(0)
  })

  it('isian tidak valid: 422 dengan kolom; di alamat selain desa: NOT_FOUND; tanpa Origin: FORBIDDEN', async () => {
    const { app } = rakit()
    const pendek = await kirimJson(app, SS, '/api/v1/warga/masuk', { nik: '123', pin: 'abc' })
    expect(pendek.status).toBe(422)
    expect(galatSchema.parse(await pendek.json()).error.fields).toHaveProperty('nik')
    expect((await masuk(app, SITI.nik, SITI.pin, '10.26.0.1', 'http://sinfodes.localhost')).status).toBe(404)
    const tanpaAsal = await app.fetch(new Request(`${SS}/api/v1/warga/masuk`, { method: 'POST', body: JSON.stringify({ nik: SITI.nik, pin: SITI.pin }) }))
    expect(tanpaAsal.status).toBe(403)
  })

  it('batas laju per IP di memori: lima kegagalan dari satu IP lalu RATE_LIMITED, IP lain tidak terkena', async () => {
    const { app } = rakit()
    for (let i = 0; i < 5; i++) expect((await masuk(app, `31710141019000${10 + i}`, '000000', '10.27.0.1')).status).toBe(422)
    expect((await masuk(app, SITI.nik, SITI.pin, '10.27.0.1')).status).toBe(429)
    expect((await masuk(app, SITI.nik, SITI.pin, '10.27.0.2')).status).toBe(200)
  })
})

describe('GET /warga/sesi, POST /warga/sesi/keluar, POST /warga/lupa-pin', () => {
  it('GET /warga/sesi memberi sesi dengan cookie dan 401 tanpa atau dengan cookie dari alamat lain', async () => {
    const { app } = rakit()
    const kuki = await masukBerhasil(app, '10.30.0.1')
    const ok = await ambil(app, `${SS}/api/v1/warga/sesi`, kuki)
    expect(ok.status).toBe(200)
    expect(sesiWargaSchema.parse(await ok.json()).penduduk.id).toBe(SITI.id)
    expect((await ambil(app, `${SS}/api/v1/warga/sesi`)).status).toBe(401)
    expect((await ambil(app, `${TL}/api/v1/warga/sesi`, kuki)).status).toBe(401)
    expect((await ambil(app, `${SS}/api/v1/sesi`, kuki)).status).toBe(401)
  })

  it('keluar mencabut sesi: cookie yang sama lalu 401, cookie dihapus, dicabut tercatat; keluar tanpa sesi tetap 204', async () => {
    const { app } = rakit()
    const kuki = await masukBerhasil(app, '10.30.0.2')
    const keluar = await kirimJson(app, SS, '/api/v1/warga/sesi/keluar', {}, kuki)
    expect(keluar.status).toBe(204)
    expect(keluar.headers.getSetCookie()[0]).toMatch(/^__Host-warga=;.*Max-Age=0/)
    expect((await ambil(app, `${SS}/api/v1/warga/sesi`, kuki)).status).toBe(401)
    const token = kuki.split('=')[1]
    expect((await uji.sqlMigrasi`select dicabut from sesi_warga where token_hash = ${hashToken(token)}`)[0].dicabut).not.toBeNull()
    expect((await kirimJson(app, SS, '/api/v1/warga/sesi/keluar', {})).status).toBe(204)
  })

  it('lupa PIN: jawaban sama untuk NIK terdaftar maupun tidak, PIN tidak berubah, dan dibatasi per IP', async () => {
    const { app } = rakit()
    const [sebelum] = await uji.sqlMigrasi`select pin_hash from akun_warga where penduduk_id = ${SITI.id}`
    const ada = await kirimJson(app, SS, '/api/v1/warga/lupa-pin', { nik: SITI.nik }, null, { 'X-Uji-Ip': '10.31.0.1' })
    const tidak = await kirimJson(app, SS, '/api/v1/warga/lupa-pin', { nik: NIK_ASING }, null, { 'X-Uji-Ip': '10.31.0.1' })
    expect(ada.status).toBe(200)
    expect(hasilLupaPinSchema.parse(await ada.json())).toEqual(hasilLupaPinSchema.parse(await tidak.json()))
    const [sesudah] = await uji.sqlMigrasi`select pin_hash from akun_warga where penduduk_id = ${SITI.id}`
    expect(sesudah.pin_hash).toBe(sebelum.pin_hash)
    for (let i = 0; i < 4; i++) await kirimJson(app, SS, '/api/v1/warga/lupa-pin', { nik: NIK_ASING }, null, { 'X-Uji-Ip': '10.31.0.1' })
    expect((await kirimJson(app, SS, '/api/v1/warga/lupa-pin', { nik: NIK_ASING }, null, { 'X-Uji-Ip': '10.31.0.1' })).status).toBe(429)
    expect((await kirimJson(app, SS, '/api/v1/warga/lupa-pin', { nik: '123' })).status).toBe(422)
  })
})

describe('PATCH /warga/akun', () => {
  const ubah = (app: App, badan: unknown, kuki: string | null) => app.fetch(
    new Request(`${SS}/api/v1/warga/akun`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: SS, ...(kuki ? { Cookie: kuki } : {}) },
      body: JSON.stringify(badan),
    }),
  )
  const pulihkan = async () => {
    await uji.sqlMigrasi`update akun_warga set pin_hash = ${await hashKataSandi(SITI.pin)}, whatsapp_sandi = ${penyandi.sandikan('081277402231', ruang.whatsapp('desa_sungai_sialang'))} where penduduk_id = ${SITI.id}`
  }
  afterEach(pulihkan)

  it('ganti PIN: PIN lama wajib benar, PIN lemah ditolak, PIN baru dipakai masuk, sesi lain dicabut', async () => {
    const { app } = rakit()
    const kuki = await masukBerhasil(app, '10.32.0.1')
    const lain = await masukBerhasil(app, '10.32.0.2')
    const hash = async () => (await uji.sqlMigrasi`select pin_hash from akun_warga where penduduk_id = ${SITI.id}`)[0].pin_hash as string
    const awal = await hash()
    const salah = await ubah(app, { pinLama: '999999', pinBaru: '582913' }, kuki)
    expect(salah.status).toBe(422)
    expect(galatSchema.parse(await salah.json()).error.fields).toEqual({ pinLama: 'PIN lama salah.' })
    for (const [baru, pesan] of [['123456', 'PIN tidak boleh angka berurutan seperti 123456.'], ['111111', 'PIN tidak boleh 6 angka yang sama.'], [SITI.pin, 'PIN baru harus berbeda dari PIN lama.']] as const) {
      const lemah = await ubah(app, { pinLama: SITI.pin, pinBaru: baru }, kuki)
      expect(lemah.status, baru).toBe(422)
      expect(galatSchema.parse(await lemah.json()).error.fields, baru).toEqual({ pinBaru: pesan })
    }
    expect(await hash(), 'tidak ada yang berubah').toBe(awal)
    const ok = await ubah(app, { pinLama: SITI.pin, pinBaru: '582913' }, kuki)
    expect(ok.status).toBe(200)
    expect(sesiWargaSchema.parse(await ok.json()).penduduk.id).toBe(SITI.id)
    expect(await periksaKataSandi(await hash(), '582913')).toBe(true)
    expect((await masuk(app, SITI.nik, SITI.pin, '10.32.0.3')).status).toBe(422)
    expect((await masuk(app, SITI.nik, '582913', '10.32.0.4')).status).toBe(200)
    expect((await ambil(app, `${SS}/api/v1/warga/sesi`, kuki)).status, 'sesi yang dipakai tetap berlaku').toBe(200)
    expect((await ambil(app, `${SS}/api/v1/warga/sesi`, lain)).status, 'sesi lain dicabut').toBe(401)
  })

  it('PIN lama yang salah berulang dikunci seperti masuk (pencuri sesi tidak bisa menebak PIN lewat sini)', async () => {
    const { app } = rakit()
    const kuki = await masukBerhasil(app, '10.32.1.1')
    for (let i = 0; i < 4; i++) expect((await ubah(app, { pinLama: '000000', pinBaru: '582913' }, kuki)).status).toBe(422)
    expect((await ubah(app, { pinLama: '000000', pinBaru: '582913' }, kuki)).status).toBe(429)
    expect((await ubah(app, { pinLama: SITI.pin, pinBaru: '582913' }, kuki)).status).toBe(429)
  })

  it('ganti nomor WhatsApp: +62 dibersihkan dan disandikan; nomor tidak valid ditolak tanpa mengubah apa pun', async () => {
    const { app } = rakit()
    const kuki = await masukBerhasil(app, '10.32.2.1')
    const ok = await ubah(app, { whatsapp: '+62 812-7740-9999' }, kuki)
    expect(ok.status).toBe(200)
    expect(sesiWargaSchema.parse(await ok.json()).whatsapp).toBe('081277409999')
    const [b] = await uji.sqlMigrasi`select whatsapp_sandi from akun_warga where penduduk_id = ${SITI.id}`
    expect(b.whatsapp_sandi).not.toContain('081277409999')
    expect(penyandi.bukaSandi(b.whatsapp_sandi, ruang.whatsapp('desa_sungai_sialang'))).toBe('081277409999')
    const rusak = await ubah(app, { whatsapp: '12345' }, kuki)
    expect(rusak.status).toBe(422)
    expect(galatSchema.parse(await rusak.json()).error.fields).toHaveProperty('whatsapp')
  })

  it('isian kosong 422, tanpa cookie 401', async () => {
    const { app } = rakit()
    const kuki = await masukBerhasil(app, '10.32.3.1')
    expect((await ubah(app, {}, kuki)).status).toBe(422)
    expect((await ubah(app, { whatsapp: '081277409999' }, null)).status).toBe(401)
  })
})

describe('log (Review Focus 4)', () => {
  it('log masuk warga tidak memuat NIK, PIN, atau cookie', async () => {
    const { app, baris } = rakit()
    await masuk(app, NIK_ASING, '654321', '10.40.0.1')
    const kuki = await masukBerhasil(app, '10.40.0.2')
    await ambil(app, `${SS}/api/v1/warga/sesi`, kuki)
    const semua = baris.join('\n')
    expect(semua.length).toBeGreaterThan(0)
    for (const rahasia of [NIK_ASING, SITI.nik, '654321', SITI.pin, kuki.split('=')[1]]) expect(semua).not.toContain(rahasia)
  })
})
