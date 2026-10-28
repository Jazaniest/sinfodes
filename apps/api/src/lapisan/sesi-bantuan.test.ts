import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { sesiAdminSchema } from '@sinfodes/kontrak/pengguna/schema'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../test/basisdata'
import { ambil, kirimJson, rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const MENIT = 60_000
const JAM = 3600_000
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
})

let sekarang = SEKARANG_UJI
const rakit = () => {
  sekarang = SEKARANG_UJI
  return rakitApp({ klien: uji.klien, waktu: () => sekarang })
}
/** Akses yang berlaku sejak sejam sebelum SEKARANG_UJI, beserta satu sesi bantuan yang baru dibuka. */
const siapkan = async (opsi: { sesi?: { dibuat?: Date; terakhirAktif?: Date }; akses?: { lamaJam?: number; sembunyikan?: boolean } } = {}) => {
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM), lamaJam: opsi.akses?.lamaJam, sembunyikan: opsi.akses?.sembunyikan })
  const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, {
    desaId: DESA_SS,
    aksesId: akses.id,
    dibuat: opsi.sesi?.dibuat ?? lewat(-10 * MENIT),
    terakhirAktif: opsi.sesi?.terakhirAktif,
    olehNama: 'Dina Uji',
  })
  return { akses, sesi }
}

describe('sesi bantuan di keluarga panel (SPEC-V0.3 §8.6)', () => {
  it('GET /sesi: pengguna semu berperan bantuan dan batas aksesnya, tanpa email Tim', async () => {
    const { app } = rakit()
    const { akses, sesi } = await siapkan({ akses: { sembunyikan: true } })
    const res = await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)
    expect(res.status).toBe(200)
    const isi = sesiAdminSchema.parse(await res.json())
    expect(isi.pengguna).toMatchObject({ id: `bantuan_${sesi.id}`, desaId: DESA_SS, nama: 'Dina Uji', jabatan: 'Tim Sinfodes', peran: 'bantuan', dusunId: null, email: '', aktif: true })
    expect(isi.bantuan).toEqual({ sampai: akses.sampai.toISOString(), sembunyikanDataPribadi: true })
    expect(isi.desa.id).toBe(DESA_SS)
  })

  it('di alamat desa lain: 401', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan()
    expect((await ambil(app, `${TL}/api/v1/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('akses dicabut di tengah sesi: permintaan berikutnya 401', async () => {
    const { app } = rakit()
    const { akses, sesi } = await siapkan()
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(200)
    await uji.sqlMigrasi`update akses_bantuan set dicabut = ${SEKARANG_UJI} where id = ${akses.id}`
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('akses habis di tengah sesi: 401 begitu waktu melewati sampai', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan({ akses: { lamaJam: 2 } })
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(200)
    sekarang = lewat(1 * JAM + 1000)
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('menganggur 30 menit mengakhiri sesi; 29 menit masih hidup', async () => {
    const { app } = rakit()
    const hidup = await siapkan({ sesi: { terakhirAktif: lewat(-29 * MENIT) } })
    expect((await ambil(app, `${SS}/api/v1/sesi`, hidup.sesi.kuki)).status).toBe(200)
    const mati = await siapkan({ sesi: { terakhirAktif: lewat(-30 * MENIT) } })
    expect((await ambil(app, `${SS}/api/v1/sesi`, mati.sesi.kuki)).status).toBe(401)
  })

  it('batas mutlak 8 jam berlaku walau sesi terus dipakai', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan({ sesi: { dibuat: lewat(-8 * JAM - 1000), terakhirAktif: lewat(-1 * MENIT) }, akses: { lamaJam: 72 } })
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('terakhir_aktif bergeser hanya bila lebih tua dari 60 detik', async () => {
    const { app } = rakit()
    const baru = await siapkan({ sesi: { terakhirAktif: lewat(-30_000) } })
    const lama = await siapkan({ sesi: { terakhirAktif: lewat(-2 * MENIT) } })
    expect((await ambil(app, `${SS}/api/v1/sesi`, baru.sesi.kuki)).status).toBe(200)
    expect((await ambil(app, `${SS}/api/v1/sesi`, lama.sesi.kuki)).status).toBe(200)
    const baca = async (id: string) => (await uji.sqlMigrasi`select terakhir_aktif from sesi_bantuan where id = ${id}`)[0].terakhir_aktif as Date
    expect(await baca(baru.sesi.id)).toEqual(lewat(-30_000))
    expect(await baca(lama.sesi.id)).toEqual(SEKARANG_UJI)
  })

  it('token berbentuk gaya tiruan (bantuan., demo.) ditolak 401', async () => {
    const { app } = rakit()
    await siapkan()
    for (const nilai of ['bantuan.sbt_abc', 'demo.pgn_rosmiati']) {
      expect((await ambil(app, `${SS}/api/v1/sesi`, `__Host-panel=${nilai}`)).status, nilai).toBe(401)
    }
  })

  it('cookie bantuan tidak dibaca rute warga', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan()
    expect((await ambil(app, `${SS}/api/v1/warga/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('POST /sesi/keluar mencabut sesi bantuan dan permintaan berikutnya 401', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan()
    const res = await kirimJson(app, SS, '/api/v1/sesi/keluar', {}, sesi.kuki)
    expect(res.status).toBe(204)
    expect((await uji.sqlMigrasi`select dicabut from sesi_bantuan where id = ${sesi.id}`)[0].dicabut).toEqual(SEKARANG_UJI)
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('masuk panel dengan cookie bantuan di peramban mencabut sesi bantuan itu', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan()
    const res = await kirimJson(app, SS, '/api/v1/sesi/masuk', { email: 'rosmiati@sungaisialang.desa.id', kataSandi: 'demo' }, sesi.kuki, { 'X-Uji-Ip': '10.4.0.1' })
    expect(res.status).toBe(200)
    expect((await uji.sqlMigrasi`select dicabut from sesi_bantuan where id = ${sesi.id}`)[0].dicabut).toEqual(SEKARANG_UJI)
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(401)
  })

  it('sesi bantuan membaca data desa lewat peran bantuan (penduduk.lihat), dan pengguna di tabel sesi biasa tetap berjalan', async () => {
    const { app } = rakit()
    const { sesi } = await siapkan({ akses: { sembunyikan: false } })
    const res = await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, sesi.kuki)
    expect(res.status).toBe(200)
  })
})
