import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { tiketBantuanSchema } from '@sinfodes/kontrak/konsol/schema'
import { hasilMasukSchema } from '@sinfodes/kontrak/pengguna/schema'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kukiDariJawaban, rakitApp, sisipAksesUji, sisipSesiKonsolUji, sisipSesiUji, sisipTiketUji } from '../../../test/rakit-app'
import { badanGalat } from '../../galat'
import { hashToken } from '../../kripto/token'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const KONSOL = 'http://konsol.sinfodes.localhost'
const INDUK = 'http://sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const PESAN_TIKET = 'Tiket bantuan tidak berlaku. Minta ulang dari Konsol.'
const BADAN_TIKET_TIDAK_BERLAKU = badanGalat('UNAUTHENTICATED', PESAN_TIKET)
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from jejak_bantuan`
  await uji.sqlMigrasi`delete from sesi_bantuan`
  await uji.sqlMigrasi`delete from tiket_bantuan`
  await uji.sqlMigrasi`delete from akses_bantuan`
  await uji.sqlMigrasi`delete from jejak_audit where jenis like 'akses_bantuan.%'`
  await uji.sqlMigrasi`delete from jejak_audit_platform where jenis like 'akses_bantuan.%'`
})

let sekarang = SEKARANG_UJI
const rakit = async () => {
  sekarang = SEKARANG_UJI
  return rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => sekarang })
}
type App = Awaited<ReturnType<typeof rakit>>['app']
const kirim = (app: App, basis: string, jalur: string, badan: unknown, kuki?: string | null, ip = 'tak-dikenal') =>
  app.fetch(
    new Request(`${basis}${jalur}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: basis, 'X-Uji-Ip': ip, ...(kuki ? { Cookie: kuki } : {}) },
      body: typeof badan === 'string' ? badan : JSON.stringify(badan),
    }),
  )
const kukiKonsol = async () => (await sisipSesiKonsolUji(uji.sqlMigrasi, { penggunaId: 'kns_dina', dibuat: lewat(-1 * MENIT) })).kuki
const aksesAktif = (opsi: { dicabut?: Date; mulai?: Date; lamaJam?: number; sembunyikan?: boolean; desaId?: string } = {}) =>
  sisipAksesUji(uji.sqlMigrasi, { desaId: opsi.desaId ?? DESA_SS, mulai: opsi.mulai ?? lewat(-1 * JAM), lamaJam: opsi.lamaJam, dicabut: opsi.dicabut ?? null, sembunyikan: opsi.sembunyikan })
const urlTiket = (desaId: string) => `/api/v1/konsol/desa/${desaId}/tiket-bantuan`

describe('POST /konsol/desa/:id/tiket-bantuan', () => {
  it('tanpa sesi Konsol 401; cookie Konsol di alamat desa juga 401', async () => {
    const { app } = await rakit()
    await aksesAktif()
    expect((await kirim(app, KONSOL, urlTiket(DESA_SS), {})).status).toBe(401)
    expect((await kirim(app, SS, urlTiket(DESA_SS), {}, await kukiKonsol())).status).toBe(401)
  })

  it('dengan akses berlaku: jawaban berisi tepat tiket dan alamat; basis data hanya menyimpan hash, berlaku 60 detik; audit platform tercatat', async () => {
    const { app } = await rakit()
    const akses = await aksesAktif()
    const res = await kirim(app, KONSOL, urlTiket(DESA_SS), {}, await kukiKonsol())
    expect(res.status).toBe(200)
    const mentah = (await res.json()) as Record<string, unknown>
    expect(Object.keys(mentah).sort()).toEqual(['alamat', 'tiket'])
    const isi = tiketBantuanSchema.parse(mentah)
    expect(isi.alamat).toBe('sungaisialang')
    const baris = await uji.sqlMigrasi`select token_hash, berlaku_sampai, dibuat, dipakai, oleh_id, oleh_nama, akses_id, desa_id from tiket_bantuan`
    expect(baris).toHaveLength(1)
    expect(baris[0].token_hash).toBe(hashToken(isi.tiket))
    expect(baris[0].token_hash).not.toBe(isi.tiket)
    expect(baris[0]).toMatchObject({ oleh_id: 'kns_dina', oleh_nama: 'Dina', akses_id: akses.id, desa_id: DESA_SS, dipakai: null })
    expect(baris[0].berlaku_sampai).toEqual(lewat(60_000))
    const audit = await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit_platform where jenis = 'akses_bantuan.tiket'`
    expect(audit).toHaveLength(1)
    expect(audit[0].pelaku).toBe('kns_dina')
    expect(audit[0].ringkasan).toEqual({ desaId: DESA_SS, aksesId: akses.id })
    expect(JSON.stringify(audit)).not.toContain(isi.tiket)
  })

  it('tanpa akses, akses dicabut, atau akses habis: 409 dengan pesan tiruan; desa tak dikenal 404', async () => {
    const { app } = await rakit()
    const kuki = await kukiKonsol()
    const konflik = async () => {
      const res = await kirim(app, KONSOL, urlTiket(DESA_SS), {}, kuki)
      expect(res.status).toBe(409)
      expect(galatSchema.parse(await res.json()).error).toMatchObject({ code: 'CONFLICT', message: 'Desa belum memberi akses bantuan.' })
    }
    await konflik()
    await aksesAktif({ dicabut: lewat(-1 * MENIT) })
    await konflik()
    await aksesAktif({ mulai: lewat(-30 * JAM), lamaJam: 24 })
    await konflik()
    const tidakAda = await kirim(app, KONSOL, urlTiket('desa_tidak_ada'), {}, kuki)
    expect(tidakAda.status).toBe(404)
    expect(galatSchema.parse(await tidakAda.json()).error).toMatchObject({ code: 'NOT_FOUND', message: 'Desa tidak ditemukan.' })
    expect((await uji.sqlMigrasi`select count(*)::int as n from tiket_bantuan`)[0].n).toBe(0)
  })

  it('permintaan ketujuh dalam satu menit dari akun yang sama dibatasi 429', async () => {
    const { app } = await rakit()
    await aksesAktif()
    const kuki = await kukiKonsol()
    for (let i = 0; i < 6; i++) expect((await kirim(app, KONSOL, urlTiket(DESA_SS), {}, kuki)).status, `ke-${i + 1}`).toBe(200)
    const res = await kirim(app, KONSOL, urlTiket(DESA_SS), {}, kuki)
    expect(res.status).toBe(429)
    expect(galatSchema.parse(await res.json()).error.code).toBe('RATE_LIMITED')
  })
})

describe('POST /sesi/bantuan (menukar tiket)', () => {
  const siapkanTiket = async (opsi: { dicabut?: Date; desaId?: string } = {}) => {
    const akses = await aksesAktif({ dicabut: opsi.dicabut, desaId: opsi.desaId })
    const tiket = await sisipTiketUji(uji.sqlMigrasi, { desaId: opsi.desaId ?? DESA_SS, aksesId: akses.id, mulai: SEKARANG_UJI, olehId: 'kns_dina', olehNama: 'Dina' })
    return { akses, tiket: tiket.tiket }
  }

  it('tiket sah menjadi sesi bantuan: cookie panel HttpOnly, badan tanpa token, GET /sesi berperan bantuan, audit pemakaian', async () => {
    const { app } = await rakit()
    const { akses, tiket } = await siapkanTiket()
    const res = await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket })
    expect(res.status).toBe(200)
    const mentah = (await res.json()) as Record<string, unknown>
    expect(mentah).not.toHaveProperty('token')
    const isi = hasilMasukSchema.parse(mentah)
    expect(isi.sesi.pengguna).toMatchObject({ peran: 'bantuan', nama: 'Dina', jabatan: 'Tim Sinfodes', email: '' })
    expect(isi.sesi.bantuan).toEqual({ sampai: akses.sampai.toISOString(), sembunyikanDataPribadi: true })
    const kuki = kukiDariJawaban(res)
    expect(kuki).toMatch(/^__Host-panel=[A-Za-z0-9_-]{43}$/)
    const atribut = res.headers.getSetCookie()[0]
    expect(atribut).toContain('HttpOnly')
    expect(atribut).toContain('Secure')
    expect(atribut).toContain('SameSite=Lax')
    expect(atribut).not.toMatch(/Domain=/i)
    const sesi = await ambil(app, `${SS}/api/v1/sesi`, kuki)
    expect(sesi.status).toBe(200)
    const token = (kuki as string).split('=')[1]
    const baris = await uji.sqlMigrasi`select id, token_hash, oleh_id, oleh_nama from sesi_bantuan where token_hash = ${hashToken(token)}`
    expect(baris).toHaveLength(1)
    expect(baris[0]).toMatchObject({ oleh_id: 'kns_dina', oleh_nama: 'Dina' })
    expect((await uji.sqlMigrasi`select dipakai from tiket_bantuan`)[0].dipakai).toEqual(SEKARANG_UJI)
    const audit = await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit where jenis = 'akses_bantuan.pakai'`
    expect(audit).toHaveLength(1)
    expect(audit[0].ringkasan).toEqual({ aksesId: akses.id, sesiId: baris[0].id, olehKonsolId: 'kns_dina' })
    expect(JSON.stringify(audit)).not.toContain(tiket)
    expect(JSON.stringify(audit)).not.toContain(token)
  })

  it('tiket hanya sekali pakai', async () => {
    const { app } = await rakit()
    const { tiket } = await siapkanTiket()
    expect((await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket })).status).toBe(200)
    const kedua = await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket })
    expect(kedua.status).toBe(401)
    expect(await kedua.json()).toEqual(BADAN_TIKET_TIDAK_BERLAKU)
  })

  it('tiket lewat 60 detik, akses dicabut sebelum penukaran, dan tiket desa lain di alamat ini ditolak 401 yang sama', async () => {
    const { app } = await rakit()
    const lama = await siapkanTiket()
    sekarang = lewat(61_000)
    const kedaluwarsa = await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket: lama.tiket })
    expect(kedaluwarsa.status).toBe(401)
    expect(await kedaluwarsa.json()).toEqual(BADAN_TIKET_TIDAK_BERLAKU)
    sekarang = SEKARANG_UJI
    const dicabut = await siapkanTiket({ dicabut: lewat(-1 * MENIT) })
    const mati = await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket: dicabut.tiket }, null, '10.6.0.1')
    expect(mati.status).toBe(401)
    expect(await mati.json()).toEqual(BADAN_TIKET_TIDAK_BERLAKU)
    const milikSs = await siapkanTiket()
    const dialamatLain = await kirim(app, TL, '/api/v1/sesi/bantuan', { tiket: milikSs.tiket }, null, '10.6.0.2')
    expect(dialamatLain.status).toBe(401)
    expect(await dialamatLain.json()).toEqual(BADAN_TIKET_TIDAK_BERLAKU)
    // tiket yang salah alamat tidak hangus: masih bisa dipakai di desanya.
    expect((await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket: milikSs.tiket }, null, '10.6.0.3')).status).toBe(200)
  })

  it('dua penukaran serentak: tepat satu berhasil', async () => {
    const { app } = await rakit()
    const { tiket } = await siapkanTiket()
    const hasil = await Promise.all([
      kirim(app, SS, '/api/v1/sesi/bantuan', { tiket }, null, '10.6.1.1'),
      kirim(app, SS, '/api/v1/sesi/bantuan', { tiket }, null, '10.6.1.2'),
    ])
    expect(hasil.map((r) => r.status).sort()).toEqual([200, 401])
    expect((await uji.sqlMigrasi`select count(*)::int as n from sesi_bantuan`)[0].n).toBe(1)
  })

  it('tiket ngawur, kosong, bukan string, tanpa isian, bukan JSON, atau terlalu panjang: jawaban identik dan tanpa Set-Cookie', async () => {
    const { app } = await rakit()
    await siapkanTiket()
    const kasus: unknown[] = [{ tiket: 'ngawur' }, { tiket: '' }, { tiket: 123 }, {}, 'bukan json', { tiket: 'a'.repeat(500) }, { tiket: 'A'.repeat(43) }]
    for (const [i, badan] of kasus.entries()) {
      const res = await kirim(app, SS, '/api/v1/sesi/bantuan', badan, null, `10.6.2.${i}`)
      expect(res.status, JSON.stringify(badan)).toBe(401)
      expect(res.headers.getSetCookie(), JSON.stringify(badan)).toHaveLength(0)
      expect(await res.json(), JSON.stringify(badan)).toEqual(BADAN_TIKET_TIDAK_BERLAKU)
    }
  })

  it('cookie panel yang sudah ada di peramban itu dicabut saat menukar tiket', async () => {
    const { app } = await rakit()
    const { tiket } = await siapkanTiket()
    const lama = await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_hendri', desaId: DESA_SS, dibuat: lewat(-1 * MENIT) })
    expect((await ambil(app, `${SS}/api/v1/sesi`, lama.kuki)).status).toBe(200)
    expect((await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket }, lama.kuki)).status).toBe(200)
    expect((await ambil(app, `${SS}/api/v1/sesi`, lama.kuki)).status).toBe(401)
  })

  it('percobaan kesebelas dalam satu menit dari satu IP dibatasi 429; alamat bukan desa 404', async () => {
    const { app } = await rakit()
    for (let i = 0; i < 10; i++) expect((await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket: 'ngawur' }, null, '10.6.3.1')).status).toBe(401)
    const res = await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket: 'ngawur' }, null, '10.6.3.1')
    expect(res.status).toBe(429)
    expect(galatSchema.parse(await res.json()).error.code).toBe('RATE_LIMITED')
    expect((await kirim(app, INDUK, '/api/v1/sesi/bantuan', { tiket: 'ngawur' }, null, '10.6.3.2')).status).toBe(404)
  })

  it('alur penuh: tiket dari Konsol ditukar di desa, panel dibuka lihat saja, halaman tercatat dan NIK disamarkan', async () => {
    const { app } = await rakit()
    await aksesAktif({ sembunyikan: true })
    const ambilTiket = await kirim(app, KONSOL, urlTiket(DESA_SS), {}, await kukiKonsol())
    const { tiket, alamat } = tiketBantuanSchema.parse(await ambilTiket.json())
    expect(alamat).toBe('sungaisialang')
    const tukar = await kirim(app, SS, '/api/v1/sesi/bantuan', { tiket })
    const kuki = kukiDariJawaban(tukar)
    const daftar = await ambil(app, `${SS}/api/v1/penduduk`, kuki)
    expect(daftar.status).toBe(200)
    expect(/\d{16}/.test(JSON.stringify(await daftar.json()))).toBe(false)
    const jejak = await uji.sqlMigrasi`select jalur from jejak_bantuan`
    expect(jejak.map((b) => b.jalur)).toEqual(['/penduduk'])
  })
})
