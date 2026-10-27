import { galatSchema } from '@sinfodes/kontrak/api'
import { KEMAMPUAN_TULIS, boleh } from '@sinfodes/kontrak/pengguna/hak-akses'
import { sql as dsql } from 'drizzle-orm'
import type { Context } from 'hono'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../test/basisdata'
import { klienTanpaDb, rakitApp, sisipSesiUji } from '../../test/rakit-app'
import { buatKlien, type Klien } from '../basisdata/klien'
import { GalatApp } from '../galat'
import { butuhAkses, butuhDesa, butuhPelakuPanel, dbTanpaPelaku } from './akses'
import { batasiLaju, buatBatasLaju } from './batas-laju'

const AWAL = new Date('2026-09-24T02:00:00Z')
const MENIT = 60_000
const JAM = 60 * MENIT
const DESA_SS = 'desa_sungai_sialang'
const DESA_TL = 'desa_tanjung_lamo'
const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const INDUK = 'http://sinfodes.localhost'
const SAMA_ASAL = { Origin: SS }

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})

/** Klien pembungkus yang menghitung transaksi menurut peran. */
function pantau(klien: Klien) {
  const hitung = { publik: 0, desa: 0 }
  const dibungkus: Klien = {
    dalamTransaksi(peran, konteks, fn) {
      if (peran === 'publik' || peran === 'desa') hitung[peran]++
      return klien.dalamTransaksi(peran, konteks, fn)
    },
    tutup: () => klien.tutup(),
  }
  return { klien: dibungkus, hitung }
}

/** Aplikasi dengan rute contoh yang memakai pembantu lapisan persis seperti rute sungguhan nanti. */
function rakitDenganRute(opsi: { klien?: Klien; waktu?: () => Date; ipKlien?: (c: Context) => string } = {}) {
  const r = rakitApp({ klien: opsi.klien ?? uji.klien, waktu: opsi.waktu, ipKlien: opsi.ipKlien })
  const { app } = r
  app.get('/api/v1/contoh/alamat', (c) => {
    const a = c.get('alamat')
    return c.json({ konteks: a.konteks, desaId: a.desa?.desa.id ?? null, labelBaru: a.labelBaru })
  })
  app.get('/api/v1/contoh/desa', (c) => c.json({ id: butuhDesa(c).desa.id }))
  app.get('/api/v1/contoh/aku', (c) => c.json({ id: butuhPelakuPanel(c).id, sesiId: butuhPelakuPanel(c).sesiId }))
  app.get('/api/v1/contoh/hitung', async (c) => {
    const { db } = butuhAkses(c, 'penduduk.lihat')
    const [b] = await db.execute<{ n: number; konteks: string | null }>(
      dsql`select (select count(*) from penduduk)::int as n, current_setting('sinfodes.desa_id', true) as konteks`,
    )
    return c.json({ n: Number(b.n), konteks: b.konteks })
  })
  app.get('/api/v1/contoh/baca-ubah', (c) => {
    butuhAkses(c, 'penduduk.ubah')
    return c.json({ ok: true })
  })
  app.post('/api/v1/contoh/tulis', (c) => {
    butuhAkses(c, 'penduduk.ubah')
    return c.json({ ok: true })
  })
  app.post('/api/v1/contoh/kelola-pengguna', (c) => {
    butuhAkses(c, 'pengguna.kelola', 'Peran Anda tidak berhak mengelola pengguna.')
    return c.json({ ok: true })
  })
  app.post('/api/v1/contoh/tulis-lalu-gagal', async (c) => {
    const { db } = butuhAkses(c, 'penduduk.ubah')
    await db.execute(dsql`update penduduk set catatan = 'dari-uji-lapisan' where id = 'pdk_siti_rahmah'`)
    throw new GalatApp('CONFLICT', 'Gagal sesudah menulis.', 409)
  })
  app.post('/api/v1/contoh/tulis-lalu-tolak', async (c) => {
    const { db } = butuhAkses(c, 'penduduk.ubah')
    await db.execute(dsql`update penduduk set catatan = 'dari-uji-lapisan' where id = 'pdk_siti_rahmah'`)
    return c.json({ error: { code: 'VALIDATION', message: 'Ditolak, tetapi jejaknya tersimpan.' } }, 400)
  })
  app.post('/api/v1/contoh/tanpa-pelaku', async (c) => {
    const { db } = dbTanpaPelaku(c)
    const [b] = await db.execute<{ n: number }>(dsql`select count(*)::int as n from pengguna`)
    return c.json({ n: Number(b.n) })
  })
  const batas = buatBatasLaju({ maks: 5, jendelaMs: MENIT, waktu: opsi.waktu ?? (() => AWAL) })
  const kunciIp = (c: Context) => c.req.header('X-Uji-Ip') ?? 'tak-dikenal'
  app.post('/api/v1/contoh/gagal-masuk', batasiLaju(batas, kunciIp), (c) => {
    if (c.req.query('gagal') === '1') {
      batas.catat(kunciIp(c))
      return c.json({ error: { code: 'VALIDATION', message: 'Salah.' } }, 400)
    }
    return c.json({ ok: true })
  })
  return r
}

const get = (app: ReturnType<typeof rakitApp>['app'], url: string, kuki?: string, tambahan: Record<string, string> = {}) =>
  app.fetch(new Request(url, { headers: { ...(kuki ? { Cookie: kuki } : {}), ...tambahan } }))
const kirim = (app: ReturnType<typeof rakitApp>['app'], url: string, kuki?: string, tambahan: Record<string, string> = {}) =>
  app.fetch(new Request(url, { method: 'POST', headers: { ...SAMA_ASAL, ...(kuki ? { Cookie: kuki } : {}), ...tambahan } }))

describe('lapisan alamat (SPEC-V0.3 §6.2)', () => {
  it('Host dibaca dari URL permintaan; X-Forwarded-Host dan header serupa diabaikan', async () => {
    const { app } = rakitDenganRute()
    const r = await get(app, `${SS}/api/v1/contoh/alamat`, undefined, { 'X-Forwarded-Host': 'konsol.sinfodes.localhost', Forwarded: 'host=konsol.sinfodes.localhost', 'X-Host': 'konsol.sinfodes.localhost' })
    expect(await r.json()).toMatchObject({ konteks: { jenis: 'desa', label: 'sungaisialang' }, desaId: DESA_SS })
  })

  it('alamat desa dikenal menjadi konteks desa; alias menjadi alias; induk dan Konsol dikenali; desa tak dikenal tidak punya desa', async () => {
    const { app } = rakitDenganRute()
    const baca = async (url: string) => (await get(app, `${url}/api/v1/contoh/alamat`)).json()
    expect(await baca(SS)).toMatchObject({ konteks: { jenis: 'desa', label: 'sungaisialang' }, desaId: DESA_SS, labelBaru: null })
    expect(await baca('http://sungai-sialang.sinfodes.localhost')).toMatchObject({ konteks: { jenis: 'desa', label: 'sungai-sialang' }, desaId: null, labelBaru: 'sungaisialang' })
    expect(await baca(INDUK)).toMatchObject({ konteks: { jenis: 'induk' }, desaId: null })
    expect(await baca('http://konsol.sinfodes.localhost')).toMatchObject({ konteks: { jenis: 'konsol' }, desaId: null })
    expect(await baca('http://desa-tidak-ada.sinfodes.localhost')).toMatchObject({ konteks: { jenis: 'desa', label: 'desa-tidak-ada' }, desaId: null, labelBaru: null })
    const tidakAda = await get(app, 'http://desa-tidak-ada.sinfodes.localhost/api/v1/contoh/desa')
    expect(tidakAda.status).toBe(404)
    expect(galatSchema.parse(await tidakAda.json()).error.code).toBe('NOT_FOUND')
  })

  it('pencarian alamat memakai peran publik dan hasilnya disimpan singkat di memori', async () => {
    const dipantau = pantau(uji.klien)
    let sekarang = AWAL
    const { app } = rakitDenganRute({ klien: dipantau.klien, waktu: () => sekarang })
    await get(app, `${SS}/api/v1/contoh/alamat`)
    await get(app, `${SS}/api/v1/contoh/alamat`)
    await get(app, 'http://tidak-ada-lagi.sinfodes.localhost/api/v1/contoh/alamat')
    await get(app, 'http://tidak-ada-lagi.sinfodes.localhost/api/v1/contoh/alamat')
    expect(dipantau.hitung.publik).toBe(2)
    sekarang = new Date(AWAL.getTime() + 2 * MENIT)
    await get(app, `${SS}/api/v1/contoh/alamat`)
    expect(dipantau.hitung.publik).toBe(3)
  })

  it('alamat induk, www, dan host luar tidak menyentuh basis data (Konsol dan kabupaten kini memakainya, sejak 8D1)', async () => {
    const { app } = rakitDenganRute({ klien: klienTanpaDb })
    for (const url of [INDUK, 'http://www.sinfodes.localhost', 'http://contoh.example.com']) {
      expect((await get(app, `${url}/api/v1/contoh/alamat`)).status).toBe(200)
    }
  })
})

describe('lapisan sesi (SPEC-V0.3 §8.1)', () => {
  it('cookie __Host-panel valid di alamat desanya memberi pelaku; di desa lain atau induk UNAUTHENTICATED', async () => {
    const { app } = rakitDenganRute()
    const s = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
    const sah = await get(app, `${SS}/api/v1/contoh/aku`, s.kuki)
    expect(sah.status).toBe(200)
    expect(await sah.json()).toEqual({ id: 'pgn_rosmiati', sesiId: s.id })
    for (const url of [TL, INDUK, 'http://konsol.sinfodes.localhost']) {
      const r = await get(app, `${url}/api/v1/contoh/aku`, s.kuki)
      expect(r.status, url).toBe(401)
      expect(galatSchema.parse(await r.json()).error.code).toBe('UNAUTHENTICATED')
    }
    expect((await get(app, `${SS}/api/v1/contoh/aku`)).status).toBe(401)
    expect((await get(app, `${SS}/api/v1/contoh/aku`, '__Host-panel=bukan-token')).status).toBe(401)
    expect((await get(app, `${SS}/api/v1/contoh/aku`, `__Secure-panel=${s.token}`)).status).toBe(401)
  })

  it('sesi habis setelah 2 jam menganggur dan 12 jam mutlak; terakhir_aktif bergeser pada permintaan aktif; sesi dicabut ditolak', async () => {
    let sekarang = AWAL
    const { app } = rakitDenganRute({ waktu: () => sekarang })
    const s = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
    const terakhir = async () => (await uji.sqlMigrasi`select terakhir_aktif from sesi where id = ${s.id}`)[0].terakhir_aktif as Date

    sekarang = new Date(AWAL.getTime() + 119 * MENIT)
    expect((await get(app, `${SS}/api/v1/contoh/aku`, s.kuki)).status).toBe(200)
    expect((await terakhir()).getTime()).toBe(sekarang.getTime())

    sekarang = new Date(AWAL.getTime() + 119 * MENIT + 121 * MENIT)
    expect((await get(app, `${SS}/api/v1/contoh/aku`, s.kuki)).status).toBe(401)

    const panjang = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL, terakhirAktif: new Date(AWAL.getTime() + 11.5 * JAM) })
    sekarang = new Date(AWAL.getTime() + 11.75 * JAM)
    expect((await get(app, `${SS}/api/v1/contoh/aku`, panjang.kuki)).status).toBe(200)
    sekarang = new Date(AWAL.getTime() + 12 * JAM + 5 * MENIT)
    expect((await get(app, `${SS}/api/v1/contoh/aku`, panjang.kuki)).status).toBe(401)

    sekarang = new Date(AWAL.getTime() + 5 * MENIT)
    const dicabut = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL, dicabut: AWAL })
    expect((await get(app, `${SS}/api/v1/contoh/aku`, dicabut.kuki)).status).toBe(401)
  })

  it('akun yang dinonaktifkan tidak lagi dikenali walau sesinya belum habis', async () => {
    const { app } = rakitDenganRute()
    const s = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_nurhayati', desaId: DESA_SS, dibuat: AWAL })
    expect((await get(app, `${SS}/api/v1/contoh/aku`, s.kuki)).status).toBe(200)
    await uji.sqlMigrasi`update pengguna set aktif = false where id = 'pgn_nurhayati'`
    try {
      expect((await get(app, `${SS}/api/v1/contoh/aku`, s.kuki)).status).toBe(401)
    } finally {
      await uji.sqlMigrasi`update pengguna set aktif = true where id = 'pgn_nurhayati'`
    }
  })
})

describe('lapisan transaksi dan akses', () => {
  it('dua permintaan berurutan untuk desa berbeda pada kolam berukuran 1 tidak berbagi konteks', async () => {
    const kecil = buatKlien(uji.urlDb, { maks: 1 })
    try {
      const { app } = rakitDenganRute({ klien: kecil })
      const a = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
      const b = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_yusri', desaId: DESA_TL, dibuat: AWAL })
      const satu = (await (await get(app, `${SS}/api/v1/contoh/hitung`, a.kuki)).json()) as { n: number; konteks: string }
      expect(satu.konteks).toBe(DESA_SS)
      expect(satu.n).toBeGreaterThan(2000)
      const dua = (await (await get(app, `${TL}/api/v1/contoh/hitung`, b.kuki)).json()) as { n: number; konteks: string }
      expect(dua).toEqual({ n: 0, konteks: DESA_TL })
      expect((await get(app, `${INDUK}/api/v1/contoh/hitung`)).status).toBe(401)
      const tiga = (await (await get(app, `${SS}/api/v1/contoh/hitung`, a.kuki)).json()) as { n: number; konteks: string }
      expect(tiga).toEqual(satu)
    } finally {
      await kecil.tutup()
    }
  })

  it('tulisan dibatalkan bila permintaan berakhir dengan galat, dan tersimpan bila jawaban galat dikembalikan biasa (jejak audit)', async () => {
    const { app } = rakitDenganRute()
    const s = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
    const catatan = async () => (await uji.sqlMigrasi`select catatan from penduduk where id = 'pdk_siti_rahmah'`)[0].catatan as string | null
    const awal = await catatan()
    const gagal = await kirim(app, `${SS}/api/v1/contoh/tulis-lalu-gagal`, s.kuki)
    expect(gagal.status).toBe(409)
    expect(await catatan()).toBe(awal)
    const tolak = await kirim(app, `${SS}/api/v1/contoh/tulis-lalu-tolak`, s.kuki)
    expect(tolak.status).toBe(400)
    expect(await catatan()).toBe('dari-uji-lapisan')
    await uji.sqlMigrasi`update penduduk set catatan = ${awal} where id = 'pdk_siti_rahmah'`
  })

  it('akses tanpa pelaku hanya lewat dbTanpaPelaku dan tetap dibatasi konteks desa alamat', async () => {
    const { app } = rakitDenganRute()
    const r = await kirim(app, `${SS}/api/v1/contoh/tanpa-pelaku`)
    expect(await r.json()).toEqual({ n: 5 })
    const lain = await app.fetch(new Request(`${TL}/api/v1/contoh/tanpa-pelaku`, { method: 'POST', headers: { Origin: TL } }))
    expect(await lain.json()).toEqual({ n: 1 })
  })

  it('desa Ditangguhkan mencabut KEMAMPUAN_TULIS untuk metode yang mengubah, tetapi membaca tetap boleh', async () => {
    expect(KEMAMPUAN_TULIS).toContain('penduduk.ubah')
    const { app } = rakitDenganRute()
    const s = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
    expect((await kirim(app, `${SS}/api/v1/contoh/tulis`, s.kuki)).status).toBe(200)
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${DESA_SS}`
    try {
      // Cache alamat (30 detik) sengaja tidak dilewati: aplikasi baru tidak membawa cache lama.
      const { app: baru } = rakitDenganRute()
      const tulis = await kirim(baru, `${SS}/api/v1/contoh/tulis`, s.kuki)
      expect(tulis.status).toBe(403)
      const isi = galatSchema.parse(await tulis.json())
      expect(isi.error).toEqual({ code: 'FORBIDDEN', message: 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.' })
      expect((await get(baru, `${SS}/api/v1/contoh/baca-ubah`, s.kuki)).status).toBe(200)
      expect((await get(baru, `${SS}/api/v1/contoh/hitung`, s.kuki)).status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${DESA_SS}`
    }
  })

  it('boleh(peran, kemampuan) dipakai langsung dari kontrak: pelaku tanpa kemampuan FORBIDDEN dengan pesan rute', async () => {
    const { app } = rakitDenganRute()
    const operator = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
    const sekdes = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_hendri', desaId: DESA_SS, dibuat: AWAL })
    expect(boleh('operator', 'pengguna.kelola')).toBe(false)
    expect(boleh('sekdes', 'pengguna.kelola')).toBe(true)
    const tolak = await kirim(app, `${SS}/api/v1/contoh/kelola-pengguna`, operator.kuki)
    expect(tolak.status).toBe(403)
    expect(galatSchema.parse(await tolak.json()).error).toEqual({ code: 'FORBIDDEN', message: 'Peran Anda tidak berhak mengelola pengguna.' })
    expect((await kirim(app, `${SS}/api/v1/contoh/kelola-pengguna`, sekdes.kuki)).status).toBe(200)
  })
})

describe('lapisan CSRF (SPEC-V0.3 §8.3)', () => {
  it('metode yang mengubah data tanpa Origin sama, atau dengan Sec-Fetch-Site bukan same-origin, ditolak FORBIDDEN; GET tidak diperiksa', async () => {
    const { app } = rakitDenganRute()
    const s = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: DESA_SS, dibuat: AWAL })
    const url = `${SS}/api/v1/contoh/tulis`
    const post = (h: Record<string, string>) => app.fetch(new Request(url, { method: 'POST', headers: { Cookie: s.kuki, ...h } }))
    expect((await post({})).status).toBe(403)
    expect((await post({ Origin: 'http://jahat.example' })).status).toBe(403)
    expect((await post({ Origin: 'null' })).status).toBe(403)
    expect((await post({ Origin: TL })).status).toBe(403)
    expect((await post({ Origin: SS, 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
    expect((await post({ Origin: SS, 'Sec-Fetch-Site': 'same-site' })).status).toBe(403)
    expect(galatSchema.parse(await (await post({})).json()).error.code).toBe('FORBIDDEN')
    expect((await post({ Origin: SS })).status).toBe(200)
    expect((await post({ Origin: SS, 'Sec-Fetch-Site': 'same-origin' })).status).toBe(200)
    expect((await get(app, `${SS}/api/v1/contoh/baca-ubah`, s.kuki, { 'Sec-Fetch-Site': 'cross-site', Origin: 'http://jahat.example' })).status).toBe(200)
  })
})

describe('batas laju (SPEC-V0.3 §8.4)', () => {
  it('setelah lima gagal dari satu IP dalam semenit, percobaan berikutnya RATE_LIMITED; IP lain dan jendela baru tidak terkena', async () => {
    let sekarang = AWAL
    const { app } = rakitDenganRute({ waktu: () => sekarang })
    const coba = (ip: string, gagal = true) =>
      app.fetch(new Request(`${SS}/api/v1/contoh/gagal-masuk${gagal ? '?gagal=1' : ''}`, { method: 'POST', headers: { Origin: SS, 'X-Uji-Ip': ip } }))
    for (let i = 0; i < 5; i++) expect((await coba('10.0.0.1')).status).toBe(400)
    const terbatas = await coba('10.0.0.1')
    expect(terbatas.status).toBe(429)
    expect(galatSchema.parse(await terbatas.json()).error.code).toBe('RATE_LIMITED')
    expect((await coba('10.0.0.2')).status).toBe(400)
    sekarang = new Date(AWAL.getTime() + MENIT + 1)
    expect((await coba('10.0.0.1', false)).status).toBe(200)
  })

  it('pembatas membersihkan catatan lama dan ukurannya terbatas', () => {
    let sekarang = AWAL
    const batas = buatBatasLaju({ maks: 2, jendelaMs: MENIT, waktu: () => sekarang })
    batas.catat('a')
    batas.catat('a')
    expect(batas.tercapai('a')).toBe(true)
    sekarang = new Date(AWAL.getTime() + 2 * MENIT)
    expect(batas.tercapai('a')).toBe(false)
    for (let i = 0; i < 20_000; i++) batas.catat(`kunci-${i}`)
    expect(batas.ukuran()).toBeLessThanOrEqual(10_000)
  })
})
