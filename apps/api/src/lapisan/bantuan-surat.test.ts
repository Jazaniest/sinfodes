import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { badanGalat } from '../galat'
import { PESAN_LIHAT_SAJA } from './bantuan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const DESA_TL = 'desa_tanjung_lamo'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)
const NOMOR16_UTUH = /(?<!\d)\d{16}(?!\d)/

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
beforeAll(async () => {
  uji = await buatDbUji()
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from jejak_bantuan`
  await uji.sqlMigrasi`delete from sesi_bantuan`
  await uji.sqlMigrasi`delete from akses_bantuan`
})

const siapkan = async (sembunyikan: boolean, desaId = DESA_SS) => {
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId, mulai: lewat(-1 * JAM), sembunyikan })
  return sisipSesiBantuanUji(uji.sqlMigrasi, { desaId, aksesId: akses.id, dibuat: lewat(-10 * MENIT), olehNama: 'Dina Uji' })
}
const kirim = (metode: string, jalur: string, kuki: string, badan?: unknown, basis = SS) =>
  app.fetch(
    new Request(`${basis}/api/v1${jalur}`, {
      method: metode,
      headers: { 'Content-Type': 'application/json', Origin: basis, Cookie: kuki },
      ...(badan === undefined ? {} : { body: JSON.stringify(badan) }),
    }),
  )
const jejak = async (): Promise<string[]> => (await uji.sqlMigrasi`select jalur from jejak_bantuan order by urut`).map((b) => b.jalur as string)
const idJenis = async (desaId: string, urutan = 0): Promise<string> => (await uji.sqlMigrasi`select id from jenis_surat where desa_id = ${desaId} order by urutan limit 1 offset ${urutan}`)[0].id as string
/** Sidik seluruh tabel surat dan kode surat desa: berubah bila ada satu baris pun yang berubah. */
const sidikSurat = async (): Promise<string[]> =>
  [
    ...(await uji.sqlMigrasi`select jenis_surat::text as t from jenis_surat order by id`),
    ...(await uji.sqlMigrasi`select pengaturan_surat::text as t from pengaturan_surat order by desa_id`),
    ...(await uji.sqlMigrasi`select (id || ':' || kode_surat) as t from desa order by id`),
  ].map((b) => b.t as string)

describe('sesi bantuan membaca jenis surat (rencana 8F1 Tugas 7)', () => {
  it('daftar dan detail jenis terbaca, pratinjau tanpa NIK dan tanpa 16 angka, dan setiap halaman tercatat di jejak bantuan', async () => {
    for (const sembunyikan of [true, false]) {
      await uji.sqlMigrasi`delete from jejak_bantuan`
      const sesi = await siapkan(sembunyikan)
      const id = await idJenis(DESA_SS)
      const daftar = await kirim('GET', '/jenis-surat', sesi.kuki)
      expect(daftar.status, `sembunyikan ${sembunyikan}`).toBe(200)
      expect(((await daftar.json()) as { data: unknown[] }).data.length).toBe(12)
      const detail = await kirim('GET', `/jenis-surat/${id}`, sesi.kuki)
      expect(detail.status).toBe(200)
      const badan = (await detail.json()) as { contoh: { pemohon: { nik: string | null; nama: string }; tiruan: boolean } }
      expect(badan.contoh).toMatchObject({ tiruan: true, pemohon: { nik: null, nama: 'Nama Pemohon' } })
      expect(JSON.stringify(badan)).not.toMatch(NOMOR16_UTUH)
      expect(await jejak()).toEqual(['/jenis-surat', `/jenis-surat/${id}`])
    }
  })

  it('tata letak dan penomoran ditolak oleh hak peran (peran bantuan tanpa pengaturan.kelola, sama dengan Wilayah) dan tidak tercatat', async () => {
    const sesi = await siapkan(true)
    for (const jalur of ['/surat/tata-letak', '/pengaturan/penomoran']) {
      const r = await kirim('GET', jalur, sesi.kuki)
      expect(r.status, jalur).toBe(403)
      expect(await r.json(), jalur).toEqual(badanGalat('FORBIDDEN', 'Peran Anda tidak berhak membuka Pengaturan desa.'))
    }
    expect(await jejak()).toEqual([])
  })

  it('sesi bantuan satu desa tidak membuka jenis desa lain: id desa lain 404; cookie desa lain di alamat ini 401', async () => {
    const sesiSs = await siapkan(false)
    const idTl = await idJenis(DESA_TL)
    const r = await kirim('GET', `/jenis-surat/${idTl}`, sesiSs.kuki)
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual(badanGalat('NOT_FOUND', 'Jenis surat tidak ditemukan.'))
    const sesiTl = await siapkan(false, DESA_TL)
    const salahAlamat = await kirim('GET', '/jenis-surat', sesiTl.kuki, undefined, SS)
    expect(salahAlamat.status).toBe(401)
    expect((await kirim('GET', '/jenis-surat', sesiTl.kuki, undefined, TL)).status).toBe(200)
  })
})

describe('sesi bantuan tidak pernah menulis jenis surat dan pengaturan surat (rencana 8F1 Tugas 7)', () => {
  it('semua tulis ditolak 403 "hanya bisa melihat", tidak mengubah satu baris pun, dan tidak tercatat di jejak', async () => {
    const sesi = await siapkan(true)
    const id = await idJenis(DESA_SS)
    const sebelum = await sidikSurat()
    const percobaan: [string, string, unknown][] = [
      ['POST', '/jenis-surat', { dari: null, kode: 'BAN', nama: 'Bantuan' }],
      ['PATCH', `/jenis-surat/${id}`, { nama: 'Diubah bantuan' }],
      ['DELETE', `/jenis-surat/${id}`, undefined],
      ['POST', `/jenis-surat/${id}/arsipkan`, {}],
      ['POST', `/jenis-surat/${id}/aktifkan-lagi`, {}],
      ['PUT', '/surat/tata-letak', {}],
      ['PUT', '/pengaturan/penomoran', { formatNomor: '{urut}/{tahun}', urutan: 'per-tahun', kodeSurat: 'BAN' }],
    ]
    for (const [metode, jalur, badan] of percobaan) {
      const r = await kirim(metode, jalur, sesi.kuki, badan)
      expect(r.status, `${metode} ${jalur}`).toBe(403)
      expect(await r.json(), `${metode} ${jalur}`).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))
    }
    expect(await sidikSurat()).toEqual(sebelum)
    expect(await jejak()).toEqual([])
  })
})
