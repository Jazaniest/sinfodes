import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { badanGalat } from '../galat'
import { PESAN_CARI_NOMOR, PESAN_LIHAT_SAJA } from './bantuan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const DESA_TL = 'desa_tanjung_lamo'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)
const NOMOR16 = /(?<!\d)\d{16}(?!\d)/

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
/** Sidik permohonan, riwayat, dan Buku hari ini: berubah bila satu baris pun ditulis. */
const sidik = async (): Promise<string[]> =>
  [
    ...(await uji.sqlMigrasi`select permohonan::text as t from permohonan order by id`),
    ...(await uji.sqlMigrasi`select riwayat_surat::text as t from riwayat_surat order by urutan`),
    ...(await uji.sqlMigrasi`select count(*)::text as t from aktivitas`),
  ].map((b) => b.t as string)
const contoh = async (status: string, denganNik = true) =>
  (
    await uji.sqlMigrasi`select p.id, p.pemohon_id, d.nama from permohonan p join penduduk d on d.id = p.pemohon_id
      where p.desa_id = ${DESA_SS} and p.status = ${status} ${denganNik ? uji.sqlMigrasi`and d.nik_sandi is not null` : uji.sqlMigrasi``} order by p.masuk_pada desc, p.id limit 1`
  )[0]

describe('sesi bantuan membaca permohonan (rencana 8F2a Tugas 8)', () => {
  it('semua GET terbaca; NIK tersamar di baris, pemohon, subjek, dan lembar beku saat disamarkan, polos bila tidak; setiap halaman tercatat', async () => {
    const selesai = await contoh('selesai')
    const kelahiran = (await uji.sqlMigrasi`select id from permohonan where desa_id = ${DESA_SS} and subjek_id is not null limit 1`)[0]
    for (const sembunyikan of [true, false]) {
      await uji.sqlMigrasi`delete from jejak_bantuan`
      const sesi = await siapkan(sembunyikan)
      const jalur = [
        '/permohonan?status=selesai&periode=365', '/permohonan/jumlah', `/permohonan/${selesai.id}`, `/permohonan/${kelahiran.id}`,
        `/permohonan/penduduk/${selesai.pemohon_id}`,
      ]
      const teks: string[] = []
      for (const j of jalur) {
        const r = await kirim('GET', j, sesi.kuki)
        expect(r.status, `${j} sembunyikan ${sembunyikan}`).toBe(200)
        teks.push(await r.text())
      }
      if (sembunyikan) for (const [i, t] of teks.entries()) expect(t, jalur[i]).not.toMatch(NOMOR16)
      else expect(teks.slice(2, 4).every((t) => NOMOR16.test(t))).toBe(true)
      // Jejak mencatat jalur beserta filternya (tanpa NIK: NIK tidak pernah ada di URL).
      expect(await jejak()).toEqual(jalur)
    }
  })

  it('antrean tanda tangan dan saran memakai hak peran bantuan: ditolak 403 dan tidak tercatat', async () => {
    const sesi = await siapkan(true)
    const antre = await kirim('GET', '/permohonan/antrian-ttd', sesi.kuki)
    expect(antre.status).toBe(403)
    expect(await antre.json()).toEqual(badanGalat('FORBIDDEN', 'Peran Anda tidak menandatangani surat.'))
    const saran = await kirim('GET', '/permohonan/saran?jenis=SKD', sesi.kuki)
    expect(saran.status).toBe(403)
    expect(await saran.json()).toEqual(badanGalat('FORBIDDEN', 'Peran Anda tidak berhak membuat surat.'))
    expect(await jejak()).toEqual([])
  })

  it('POST /permohonan/cari: nama terbaca; lima angka berurutan ditolak selama data pribadi disamarkan; NIK pada hasil tersamar', async () => {
    const o = await contoh('selesai')
    const sesi = await siapkan(true)
    const nama = await kirim('POST', '/permohonan/cari', sesi.kuki, { kata: o.nama, jenis: null })
    expect(nama.status).toBe(200)
    const teks = await nama.text()
    expect(JSON.parse(teks).data.length).toBeGreaterThan(0)
    expect(teks).not.toMatch(NOMOR16)
    const angka = await kirim('POST', '/permohonan/cari', sesi.kuki, { kata: '14050', jenis: null })
    expect(angka.status).toBe(403)
    expect(await angka.json()).toEqual(badanGalat('FORBIDDEN', PESAN_CARI_NOMOR))
    const bersela = await kirim('POST', '/permohonan/cari', sesi.kuki, { kata: '1405 0952', jenis: null })
    expect(bersela.status).toBe(403)
    // Nomor surat (bergaris miring) bukan angka NIK dan tetap bisa dicari.
    const nomor = (await uji.sqlMigrasi`select terbit_nomor from permohonan where desa_id = ${DESA_SS} and terbit_nomor is not null limit 1`)[0].terbit_nomor as string
    expect((await kirim('POST', '/permohonan/cari', sesi.kuki, { kata: nomor, jenis: null })).status).toBe(200)
  })

  it('tanpa penyamaran, pencarian dengan angka NIK dibolehkan', async () => {
    const sesi = await siapkan(false)
    const r = await kirim('POST', '/permohonan/cari', sesi.kuki, { kata: '1405095203918002', jenis: null })
    expect(r.status).toBe(200)
  })

  it('POST /permohonan, PATCH, dan setiap aksi menjawab 403 "hanya bisa melihat" tanpa mengubah satu baris pun', async () => {
    const sebelum = await sidik()
    const p = await contoh('menunggu')
    for (const sembunyikan of [true, false]) {
      const sesi = await siapkan(sembunyikan)
      const percobaan: [string, string, unknown][] = [
        ['POST', '/permohonan', { jenisId: 'js_ss_skd', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: { keperluan: 'x' }, ajukan: false }],
        ['PATCH', `/permohonan/${p.id}`, { catatanInternal: 'oleh bantuan' }],
        ...['proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan', 'tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa'].map((a): [string, string, unknown] => ['POST', `/permohonan/${p.id}/${a}`, { alasan: 'x', catatan: 'x', passphrase: 'x' }]),
      ]
      for (const [metode, jalur, badan] of percobaan) {
        const r = await kirim(metode, jalur, sesi.kuki, badan)
        expect(r.status, `${metode} ${jalur}`).toBe(403)
        expect(await r.json(), `${metode} ${jalur}`).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))
      }
    }
    expect(await sidik()).toEqual(sebelum)
  })

  it('akses untuk satu desa tidak membuka permohonan desa lain', async () => {
    const tl = await siapkan(true, DESA_TL)
    const p = await contoh('selesai')
    // Di alamat Tanjung Lamo permohonan Sungai Sialang tidak ada (RLS); di alamat Sungai Sialang cookie ini tidak dikenal.
    expect((await kirim('GET', `/permohonan/${p.id}`, tl.kuki, undefined, TL)).status).toBe(404)
    expect((await kirim('GET', `/permohonan/${p.id}`, tl.kuki, undefined, SS)).status).toBe(401)
    const daftar = await kirim('GET', '/permohonan?status=selesai&periode=365', tl.kuki, undefined, TL)
    expect(daftar.status).toBe(200)
    expect(((await daftar.json()) as { data: unknown[] }).data).toEqual([])
  })
})
