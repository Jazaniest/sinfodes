import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { aksesSinfodesSchema } from '@sinfodes/kontrak/pengaturan/akses-sinfodes'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../../test/basisdata'
import { ambil, rakitApp, sisipAksesUji, sisipSesiBantuanUji, sisipSesiUji } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const URL_AKSES = `${SS}/api/v1/pengaturan/akses-sinfodes`
const PESAN_TIDAK_BERHAK = 'Hanya Sekretaris Desa dan Kepala Desa yang memberi akses bantuan Sinfodes.'
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
  await uji.sqlMigrasi`delete from jejak_audit where jenis like 'akses_bantuan.%' or jenis = 'penyamaran.dimatikan'`
})
afterEach(async () => {
  await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${DESA_SS}`
})

let sekarang = SEKARANG_UJI
const rakit = () => {
  sekarang = SEKARANG_UJI
  return rakitApp({ klien: uji.klien, waktu: () => sekarang })
}
const cookie = async (penggunaId: string, dibuat = lewat(-1 * MENIT)) => (await sisipSesiUji(uji.sqlMigrasi, { penggunaId, desaId: DESA_SS, dibuat })).kuki
const kirim = (app: ReturnType<typeof rakit>['app'], metode: 'POST' | 'DELETE', kuki: string | null, badan?: unknown) =>
  app.fetch(
    new Request(URL_AKSES, {
      method: metode,
      headers: { 'Content-Type': 'application/json', Origin: SS, ...(kuki ? { Cookie: kuki } : {}) },
      ...(badan === undefined ? {} : { body: JSON.stringify(badan) }),
    }),
  )
const AKSES_24 = { lamaJam: 24, sembunyikanDataPribadi: true }

describe('POST /pengaturan/akses-sinfodes', () => {
  it('Sekretaris Desa memberi akses 24 jam dengan data pribadi disamarkan', async () => {
    const { app } = rakit()
    const res = await kirim(app, 'POST', await cookie('pgn_hendri'), AKSES_24)
    expect(res.status).toBe(201)
    const isi = aksesSinfodesSchema.parse(await res.json())
    expect(isi.aktif).toMatchObject({
      mulai: SEKARANG_UJI.toISOString(),
      sampai: lewat(24 * JAM).toISOString(),
      sembunyikanDataPribadi: true,
      diberiOleh: 'Hendri Saputra',
    })
    expect(isi.riwayat).toHaveLength(1)
    expect(isi.riwayat[0]).toMatchObject({ id: isi.aktif?.id, berakhir: null, diberiOleh: 'Hendri Saputra', sesi: [] })
  })

  it('Kepala Desa juga bisa memberi akses; Operator, Kaur Keuangan, dan sesi bantuan tidak', async () => {
    const { app } = rakit()
    expect((await kirim(app, 'POST', await cookie('pgn_nasir'), { lamaJam: 2, sembunyikanDataPribadi: false })).status).toBe(201)
    for (const penggunaId of ['pgn_rosmiati', 'pgn_nurhayati']) {
      const kuki = await cookie(penggunaId)
      for (const res of [await ambil(app, URL_AKSES, kuki), await kirim(app, 'POST', kuki, AKSES_24), await kirim(app, 'DELETE', kuki)]) {
        expect(res.status, penggunaId).toBe(403)
        expect(galatSchema.parse(await res.json()).error).toMatchObject({ code: 'FORBIDDEN', message: PESAN_TIDAK_BERHAK })
      }
    }
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM) })
    const bantuan = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: DESA_SS, aksesId: akses.id, dibuat: lewat(-10 * MENIT) })
    expect((await ambil(app, URL_AKSES, bantuan.kuki)).status).toBe(403)
    expect((await kirim(app, 'POST', bantuan.kuki, AKSES_24)).status).toBe(403)
  })

  it('tanpa sesi: 401', async () => {
    const { app } = rakit()
    expect((await ambil(app, URL_AKSES)).status).toBe(401)
    expect((await kirim(app, 'POST', null, AKSES_24)).status).toBe(401)
  })

  it('lama selain 2, 24, atau 72 jam, isian tanpa penyamaran, dan badan bukan JSON ditolak 422', async () => {
    const { app } = rakit()
    const kuki = await cookie('pgn_hendri')
    for (const badan of [{ lamaJam: 5, sembunyikanDataPribadi: true }, { lamaJam: 24 }, { sembunyikanDataPribadi: true }, 'bukan json', null]) {
      const res = await kirim(app, 'POST', kuki, badan)
      expect(res.status, JSON.stringify(badan)).toBe(422)
      expect(galatSchema.parse(await res.json()).error.code).toBe('VALIDATION')
    }
    expect((await uji.sqlMigrasi`select count(*)::int as n from akses_bantuan`)[0].n).toBe(0)
  })

  it('memberi akses baru menutup akses yang masih berlaku; riwayat terbaru dulu', async () => {
    const { app } = rakit()
    const kuki = await cookie('pgn_hendri')
    await kirim(app, 'POST', kuki, AKSES_24)
    sekarang = lewat(5 * MENIT)
    const res = await kirim(app, 'POST', kuki, { lamaJam: 72, sembunyikanDataPribadi: false })
    const isi = aksesSinfodesSchema.parse(await res.json())
    expect(isi.aktif).toMatchObject({ sembunyikanDataPribadi: false, sampai: lewat(5 * MENIT + 72 * JAM).toISOString() })
    expect(isi.riwayat.map((r) => r.berakhir)).toEqual([null, 'dicabut'])
    expect(isi.riwayat[0].id).toBe(isi.aktif?.id)
  })

  it('desa Ditangguhkan tetap boleh memberi dan mencabut akses (justru dibutuhkan untuk memulihkan)', async () => {
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${DESA_SS}`
    const { app } = rakit()
    const kuki = await cookie('pgn_hendri')
    expect((await kirim(app, 'POST', kuki, AKSES_24)).status).toBe(201)
    expect((await kirim(app, 'DELETE', kuki)).status).toBe(200)
  })

  it('mencatat audit tanpa data pribadi: beri, dan penyamaran.dimatikan hanya bila penyamaran dimatikan', async () => {
    const { app } = rakit()
    const kuki = await cookie('pgn_hendri')
    await kirim(app, 'POST', kuki, AKSES_24)
    let baris = await uji.sqlMigrasi`select jenis, pelaku, ringkasan from jejak_audit where jenis like 'akses_bantuan.%' or jenis = 'penyamaran.dimatikan' order by waktu, id`
    expect(baris.map((b) => b.jenis)).toEqual(['akses_bantuan.beri'])
    expect(baris[0].pelaku).toBe('pgn_hendri')
    expect(baris[0].ringkasan).toMatchObject({ lamaJam: 24, sembunyikanDataPribadi: true })
    await kirim(app, 'POST', kuki, { lamaJam: 2, sembunyikanDataPribadi: false })
    baris = await uji.sqlMigrasi`select jenis, ringkasan from jejak_audit where jenis like 'akses_bantuan.%' or jenis = 'penyamaran.dimatikan'`
    expect(baris.map((b) => b.jenis).sort()).toEqual(['akses_bantuan.beri', 'akses_bantuan.beri', 'penyamaran.dimatikan'])
    const teks = JSON.stringify(baris)
    expect(teks).not.toContain('hendri@')
    expect(teks).not.toMatch(/\d{16}/)
  })
})

describe('GET dan DELETE /pengaturan/akses-sinfodes', () => {
  it('DELETE mencabut akses aktif; riwayat teratas berakhir dicabut; DELETE lagi tanpa akses aktif tetap 200', async () => {
    const { app } = rakit()
    const kuki = await cookie('pgn_hendri')
    await kirim(app, 'POST', kuki, AKSES_24)
    const res = await kirim(app, 'DELETE', kuki)
    expect(res.status).toBe(200)
    const isi = aksesSinfodesSchema.parse(await res.json())
    expect(isi.aktif).toBeNull()
    expect(isi.riwayat[0].berakhir).toBe('dicabut')
    const lagi = aksesSinfodesSchema.parse(await (await kirim(app, 'DELETE', kuki)).json())
    expect(lagi.aktif).toBeNull()
    const audit = await uji.sqlMigrasi`select count(*)::int as n from jejak_audit where jenis = 'akses_bantuan.cabut'`
    expect(audit[0].n).toBe(1)
  })

  it('akses yang lewat sampai: aktif null dan berakhir habis', async () => {
    const { app } = rakit()
    await kirim(app, 'POST', await cookie('pgn_hendri'), { lamaJam: 2, sembunyikanDataPribadi: true })
    sekarang = lewat(2 * JAM + 1000)
    const kuki = await cookie('pgn_hendri', lewat(2 * JAM))
    const isi = aksesSinfodesSchema.parse(await (await ambil(app, URL_AKSES, kuki)).json())
    expect(isi.aktif).toBeNull()
    expect(isi.riwayat[0].berakhir).toBe('habis')
  })

  it('riwayat memuat sesi dan halaman yang dibuka Tim; desa lain tidak terlihat', async () => {
    const { app } = rakit()
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM), diberiOlehNama: 'Hendri Saputra' })
    const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: DESA_SS, aksesId: akses.id, dibuat: lewat(-30 * MENIT), olehNama: 'Dina' })
    await uji.sqlMigrasi`insert into jejak_bantuan (desa_id, sesi_id, jalur, waktu) values (${DESA_SS}, ${sesi.id}, '/penduduk', ${lewat(-20 * MENIT)})`
    await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_tanjung_lamo', mulai: lewat(-1 * JAM) })
    const isi = aksesSinfodesSchema.parse(await (await ambil(app, URL_AKSES, await cookie('pgn_nasir'))).json())
    expect(isi.riwayat).toHaveLength(1)
    expect(isi.riwayat[0].sesi).toEqual([{ oleh: 'Dina', mulai: lewat(-30 * MENIT).toISOString(), halaman: [{ jalur: '/penduduk', waktu: lewat(-20 * MENIT).toISOString() }] }])
  })
})
