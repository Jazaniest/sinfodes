import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { buatCsvUji } from '../../test/helpers/berkas-uji'
import { rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { badanGalat } from '../galat'
import { JALUR_CARI_BACA, PESAN_CARI_NOMOR, PESAN_LIHAT_SAJA } from './bantuan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)
const NIK_SITI = '1405095203918002'
const KK_SYAHRIAL = '1405092011238004'
const NOMOR16_UTUH = /(?<!\d)\d{16}(?!\d)/
const NIK_BERKELOMPOK = /(?<!\d)\d{6} \d{6} \d{4}(?!\d)/

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

const siapkan = async (sembunyikan: boolean) => {
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM), sembunyikan })
  return sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: DESA_SS, aksesId: akses.id, dibuat: lewat(-10 * MENIT), olehNama: 'Dina Uji' })
}
const kirim = (metode: string, jalur: string, kuki: string, badan?: unknown) =>
  app.fetch(
    new Request(`${SS}/api/v1${jalur}`, {
      method: metode,
      headers: { 'Content-Type': 'application/json', Origin: SS, Cookie: kuki },
      ...(badan === undefined ? {} : { body: JSON.stringify(badan) }),
    }),
  )
const jejak = async (): Promise<string[]> => (await uji.sqlMigrasi`select jalur from jejak_bantuan order by urut`).map((b) => (b.jalur as string).split('?')[0])
const hitung = async (tabel: string): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n)
const adaNikUtuh = (teks: string): boolean => NOMOR16_UTUH.test(teks) || NIK_BERKELOMPOK.test(teks)

describe('sesi bantuan membaca statistik, buku, dan cari dengan penyamaran menyala (rencana 8E3 Tugas 8)', () => {
  it('statistik penduduk terbaca (hanya angka agregat) dan tercatat di jejak bantuan', async () => {
    const sesi = await siapkan(true)
    const r = await kirim('GET', '/statistik/penduduk?dusun=2', sesi.kuki)
    expect(r.status).toBe(200)
    expect(((await r.json()) as { jiwa: number; dusun: number }).dusun).toBe(2)
    expect(await jejak()).toEqual(['/statistik/penduduk'])
  })

  it('Buku Induk, KTP dan KK, dan Buku Mutasi: tanpa 16 angka utuh maupun NIK berkelompok; NIK tersamar tetap berbentuk 1405••••••••8002', async () => {
    const sesi = await siapkan(true)
    for (const kode of ['induk-penduduk', 'ktp-kk', 'mutasi-penduduk', 'penduduk-sementara', 'rekapitulasi-penduduk']) {
      const r = await kirim('GET', `/buku-administrasi/${kode}?pageSize=5000`, sesi.kuki)
      expect(r.status, kode).toBe(200)
      const teks = JSON.stringify(await r.json())
      expect(adaNikUtuh(teks), `${kode}: NIK utuh bocor`).toBe(false)
      if (kode === 'induk-penduduk' || kode === 'ktp-kk') expect(teks, kode).toMatch(/\d{4}•{8}\d{4}/)
    }
    const daftar = await kirim('GET', '/buku-administrasi', sesi.kuki)
    expect(daftar.status).toBe(200)
    expect(await jejak()).toEqual(['/buku-administrasi/induk-penduduk', '/buku-administrasi/ktp-kk', '/buku-administrasi/mutasi-penduduk', '/buku-administrasi/penduduk-sementara', '/buku-administrasi/rekapitulasi-penduduk', '/buku-administrasi'])
  })

  it('pembanding: penyamaran mati → NIK dan nomor KK utuh di Buku Induk', async () => {
    const sesi = await siapkan(false)
    const teks = JSON.stringify(await (await kirim('GET', '/buku-administrasi/induk-penduduk?pageSize=5000', sesi.kuki)).json())
    expect(teks).toContain(NIK_SITI)
    expect(teks).toContain(KK_SYAHRIAL)
  })

  it('cari global dengan kata huruf terbaca dan tersamar; dengan angka NIK atau KK ditolak', async () => {
    const sesi = await siapkan(true)
    const r = await kirim('POST', '/cari', sesi.kuki, { kata: 'siti rahmah' })
    expect(r.status).toBe(200)
    const teks = JSON.stringify(await r.json())
    expect(teks).toContain('Siti Rahmah')
    expect(adaNikUtuh(teks)).toBe(false)
    for (const kata of [NIK_SITI, KK_SYAHRIAL, '1405 0952', '14050']) {
      const tolak = await kirim('POST', '/cari', sesi.kuki, { kata })
      expect(tolak.status, kata).toBe(403)
      expect(await tolak.json(), kata).toEqual(badanGalat('FORBIDDEN', PESAN_CARI_NOMOR))
    }
    expect(await jejak()).toEqual(['/cari'])
  })

  it('angka NIK atau KK yang dipisah spasi, titik, atau strip tidak lolos di ketiga jalur pencarian (celah sebelum 8E3: pemisah antar-angka)', async () => {
    const sesi = await siapkan(true)
    for (const kata of ['1405 0952 0391 8002', '1405.0952.0391.8002', '1405-0952-0391-8002', '1 4 0 5 0 9']) {
      for (const [jalur, badan] of [['/cari', { kata }], ['/penduduk/cari', { kata, filter: {} }], ['/keluarga/cari', { kata, filter: {} }]] as const) {
        const r = await kirim('POST', jalur, sesi.kuki, badan)
        expect(r.status, `${jalur} ${kata}`).toBe(403)
        expect(await r.json(), `${jalur} ${kata}`).toEqual(badanGalat('FORBIDDEN', PESAN_CARI_NOMOR))
      }
    }
    // Empat angka sendiri dan nama dengan angka kecil tetap boleh: hanya lima angka berurutan (setelah pemisah dibuang) yang menebak nomor.
    for (const kata of ['1405', 'siti 12', 'dusun 3 rt 11']) expect((await kirim('POST', '/cari', sesi.kuki, { kata })).status, kata).toBe(200)
  })

  it('cari global dengan penyamaran mati boleh memakai angka', async () => {
    const sesi = await siapkan(false)
    const r = await kirim('POST', '/cari', sesi.kuki, { kata: NIK_SITI })
    expect(r.status).toBe(200)
    expect(((await r.json()) as { penduduk: { nama: string }[] }).penduduk.map((p) => p.nama)).toEqual(['Siti Rahmah'])
  })
})

describe('sesi bantuan tidak pernah mengimpor (rencana 8E3 Tugas 8)', () => {
  it('unggah (JSON contoh dan multipart) serta konfirmasi ditolak 403 dan tidak membuat sesi impor atau mengubah satu baris pun', async () => {
    const sesi = await siapkan(true)
    const tabel = ['impor_penduduk', 'penduduk', 'keluarga', 'aktivitas', 'jejak_audit']
    const sebelum = await Promise.all(tabel.map(hitung))

    const contoh = await kirim('POST', '/impor/penduduk', sesi.kuki, { contoh: true })
    expect(contoh.status).toBe(403)
    expect(await contoh.json()).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))

    const formulir = new FormData()
    formulir.append('berkas', new File([Buffer.from(buatCsvUji([['NIK', 'Nama'], ['1', 'a']]))], 'a.csv'))
    const multipart = await app.fetch(new Request(`${SS}/api/v1/impor/penduduk`, { method: 'POST', headers: { Origin: SS, Cookie: sesi.kuki }, body: formulir }))
    expect(multipart.status).toBe(403)
    expect(await multipart.json()).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))

    const konfirmasi = await kirim('POST', '/impor/penduduk/imp_apa-saja/konfirmasi', sesi.kuki, { pemetaan: [], perbaikan: {}, lewati: [] })
    expect(konfirmasi.status).toBe(403)
    expect(await konfirmasi.json()).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))

    expect(await Promise.all(tabel.map(hitung))).toEqual(sebelum)
    expect(await jejak()).toEqual([])
  })

  it('daftar pencarian-baca tepat tiga jalur: /cari, /penduduk/cari, /keluarga/cari; tidak ada rute impor yang ikut', () => {
    expect([...JALUR_CARI_BACA]).toEqual(['/cari', '/penduduk/cari', '/keluarga/cari'])
  })
})
