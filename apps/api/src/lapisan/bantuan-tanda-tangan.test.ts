import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { badanGalat } from '../galat'
import { PESAN_LIHAT_SAJA } from './bantuan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)

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

const siapkan = async () => {
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM), sembunyikan: true })
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
const jejak = async (): Promise<string[]> => (await uji.sqlMigrasi`select jalur from jejak_bantuan order by urut`).map((b) => b.jalur as string)
/** Sidik permohonan, riwayat, audit, passphrase, dan Buku hari ini: berubah bila satu baris pun ditulis. */
const sidik = async (): Promise<string[]> =>
  [
    ...(await uji.sqlMigrasi`select permohonan::text as t from permohonan order by id`),
    ...(await uji.sqlMigrasi`select riwayat_surat::text as t from riwayat_surat order by urutan`),
    ...(await uji.sqlMigrasi`select passphrase_tanda_tangan::text as t from passphrase_tanda_tangan`),
    ...(await uji.sqlMigrasi`select count(*)::text as t from aktivitas`),
    ...(await uji.sqlMigrasi`select count(*)::text as t from jejak_audit where jenis like 'surat.%' or jenis like 'passphrase.%'`),
  ].map((b) => b.t as string)

describe('sesi bantuan dan tanda tangan (rencana 8F2b Tugas 9)', () => {
  it('menolak tandatangani, batalkan, tandai-diambil, kirim-wa, dan PUT passphrase (penolakan tulis umum); tidak ada yang berubah', async () => {
    const sesi = await siapkan()
    const [{ id: ttd }] = await uji.sqlMigrasi`select id from permohonan where desa_id = ${DESA_SS} and status = 'perlu-ttd' and tahap = 'tanda-tangan' limit 1`
    const [{ id: selesai }] = await uji.sqlMigrasi`select id from permohonan where desa_id = ${DESA_SS} and status = 'selesai' limit 1`
    const awal = await sidik()
    const percobaan: [string, string, unknown][] = [
      ['POST', `/permohonan/${ttd}/tandatangani`, { passphrase: 'sialang2026' }],
      ['POST', `/permohonan/${selesai}/batalkan`, { alasan: 'Salah ketik.' }],
      ['POST', `/permohonan/${selesai}/tandai-diambil`, {}],
      ['POST', `/permohonan/${selesai}/kirim-wa`, {}],
      ['PUT', '/sesi/passphrase-tanda-tangan', { kataSandi: 'demo', passphrase: 'sialang2026' }],
    ]
    for (const [metode, jalur, badan] of percobaan) {
      const r = await kirim(metode, jalur, sesi.kuki, badan)
      expect(r.status, `${metode} ${jalur}`).toBe(403)
      expect(await r.json(), `${metode} ${jalur}`).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))
    }
    expect(await sidik()).toEqual(awal)
    // Penolakan tulis terjadi sebelum jejak: yang tercatat hanya halaman yang benar-benar dibuka (GET).
    expect(await jejak()).toEqual([])
  })

  it('GET passphrase ditolak karena peran bantuan bukan penanda tangan (Tim Sinfodes tidak punya passphrase)', async () => {
    const sesi = await siapkan()
    const r = await kirim('GET', '/sesi/passphrase-tanda-tangan', sesi.kuki)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual(badanGalat('FORBIDDEN', 'Peran Anda tidak menandatangani surat.'))
  })

  it('verifikasi publik tidak terpengaruh oleh cookie sesi bantuan (jalur publik tanpa pelaku)', async () => {
    const sesi = await siapkan()
    const r = await app.fetch(
      new Request(`${SS}/api/v1/publik/sungaisialang/verifikasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: SS, Cookie: sesi.kuki, 'X-Uji-Ip': '10.99.0.1' },
        body: JSON.stringify({ kode: 'SS-AAAA-BBBB' }),
      }),
    )
    expect(r.status).toBe(404)
    expect(await jejak()).toEqual([])
  })
})
