import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { BATAS_VERIFIKASI, PESAN_KODE_FORMAT, PESAN_KODE_TIDAK_DITEMUKAN, PESAN_VERIFIKASI_TERKUNCI } from '@sinfodes/kontrak/publik/verifikasi'
import { hasilVerifikasiSchema } from '@sinfodes/kontrak/publik/schema'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
import { kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import { PESAN_ASAL_DITOLAK } from '../../lapisan/csrf'
import { PESAN_TERLALU_SERING } from '../../lapisan/batas-laju'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_X = 'desa_x'
const X = 'http://desa-x.sinfodes.localhost'
const PEMOHON = 'pdk_siti_rahmah'
const JENIS = 'js_ss_skd'
const URL_V = (slug: string) => `/api/v1/publik/${slug}/verifikasi`
const NIK_SITI = '1405095203910001'

let uji: DbUji
let sekarang = SEKARANG_UJI
let app: ReturnType<typeof rakitApp>['app']
let kukiOperator = ''
let ipKe = 0
const ipBaru = () => `10.20.${Math.floor(ipKe / 250)}.${(ipKe++ % 250) + 1}`

beforeAll(async () => {
  uji = await buatDbUji()
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => sekarang }).app
  kukiOperator = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', ipBaru())).kuki as string
  await sisipkanDesaContoh(uji.sqlMigrasi, DESA_X, 2)
  await uji.sqlMigrasi.unsafe(
    `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
     values ('js_x', '${DESA_X}', 'SKD', 'Jenis Desa X', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
  )
}, 60_000)
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  sekarang = SEKARANG_UJI
  await uji.sqlMigrasi`delete from percobaan_verifikasi`
})

let cacah = 90_000
type Opsi = { kode: string; jenis?: string; desa?: string; status?: 'selesai' | 'dibatalkan'; berlakuSampai?: string | null; pemohon?: string; subjek?: string | null }
/** Surat sudah terbit lewat peran pemilik (sisip tidak dijaga pemicu). Kode verifikasi diatur penuh oleh uji. */
async function sisipSurat(o: Opsi): Promise<string> {
  cacah += 1
  const desa = o.desa ?? ID_SUNGAI_SIALANG
  const status = o.status ?? 'selesai'
  const jenis = o.jenis ?? (desa === DESA_X ? 'js_x' : JENIS)
  const pemohon = o.pemohon ?? (desa === DESA_X ? 'pdk_desa_x_1' : PEMOHON)
  const dusun = (await uji.sqlMigrasi`select dusun_id from penduduk where id = ${pemohon}`)[0].dusun_id as string
  const pembatalan = status === 'dibatalkan' ? `'{"oleh":{"id":"pgn_nasir","nama":"H. Muhammad Nasir"},"pada":"2026-09-20T10:00:00+07:00","catatan":"Alasan rahasia pembatalan"}'::jsonb` : 'null'
  await uji.sqlMigrasi.unsafe(
    `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, subjek_id, isian_sandi, status, masuk_pada, ditutup_pada,
       terbit_nomor, terbit_tahun, terbit_urut, terbit_kode, terbit_pada, terbit_penandatangan, terbit_mode, terbit_berlaku_sampai, terbit_lembar_sandi, terbit_tata_letak, terbit_kop, pembatalan)
     values ('pv_${cacah}', '${desa}', '${dusun}', 2026, ${cacah}, '${jenis}', 'loket', '${pemohon}', ${o.subjek ? `'${o.subjek}'` : 'null'}, 'v1.abc', '${status}', now(), now(),
       '470/${cacah}/SS/IX/2026', 2026, ${cacah}, '${o.kode}', '2026-09-10T09:00:00+07:00', '{"id":"pgn_nasir","nama":"H. Muhammad Nasir","peran":"kades","nip":"196501011990031001"}'::jsonb,
       'tte', ${o.berlakuSampai === undefined ? "'2026-12-10'" : o.berlakuSampai === null ? 'null' : `'${o.berlakuSampai}'`}, 'v1.lembar', '{}'::jsonb, '{}'::jsonb, ${pembatalan})`,
  )
  return `pv_${cacah}`
}

const verifikasi = (kode: unknown, opsi: { basis?: string; slug?: string; ip?: string; kuki?: string | null; badan?: unknown } = {}): Promise<Response> =>
  Promise.resolve(kirimJson(app, opsi.basis ?? SS, URL_V(opsi.slug ?? 'sungaisialang'), opsi.badan ?? { kode }, opsi.kuki ?? null, { 'X-Uji-Ip': opsi.ip ?? ipBaru() }))
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const cacahGagal = async (desaId = ID_SUNGAI_SIALANG) =>
  Number((await uji.sqlMigrasi`select coalesce((select cardinality(gagal_pada) from percobaan_verifikasi where desa_id = ${desaId}), 0)::int as n`)[0].n)
const ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** Kode berformat sah yang tidak dimiliki surat mana pun. */
const kodeSalah = (i: number) => `SS-${ABJAD[(i >> 5) & 31]}${ABJAD[i & 31]}ZZ-ZZZZ`

describe('POST /publik/:slug/verifikasi: hasil (rencana 8F2b Tugas 8, Ruling 13)', () => {
  it('kode surat Selesai ditemukan dengan hasil minimal, nama tersamar, tanpa NIK, NIP, id, isian, atau alamat', async () => {
    await sisipSurat({ kode: 'SS-7K3M-Q9TD' })
    const r = await verifikasi('SS-7K3M-Q9TD')
    expect(r.status, JSON.stringify(await r.clone().json())).toBe(200)
    const teks = await r.clone().text()
    const hasil = hasilVerifikasiSchema.parse(await r.json())
    expect(hasil).toEqual({
      jenis: 'Surat Keterangan Domisili',
      nomor: expect.stringMatching(/^470\/\d+\/SS\/IX\/2026$/),
      terbit: '2026-09-10T09:00:00+07:00',
      nama: 'S*** R*****',
      penandatangan: { jabatan: 'Kepala Desa', nama: 'H. Muhammad Nasir' },
      berlaku: { status: 'berlaku', sampai: '2026-12-10' },
    })
    expect(Object.keys(JSON.parse(teks) as object).sort()).toEqual(['berlaku', 'jenis', 'nama', 'nomor', 'penandatangan', 'terbit'])
    for (const terlarang of [NIK_SITI, '196501011990031001', 'pgn_nasir', 'pv_', 'Siti Rahmah', 'v1.']) expect(teks, terlarang).not.toContain(terlarang)
  })

  it('kode berhuruf kecil, bersela spasi, atau tanpa pemisah dirapikan', async () => {
    await sisipSurat({ kode: 'SS-8B4N-R2WF' })
    for (const ketik of ['ss-8b4n-r2wf', ' ss 8b4n r2wf ', 'ss8b4nr2wf', 'SS\u20138B4N\u2013R2WF']) {
      expect((await verifikasi(ketik)).status, ketik).toBe(200)
    }
  })

  it('surat Dibatalkan tetap ditemukan dengan status Dibatalkan tanpa alasan pembatalan', async () => {
    await sisipSurat({ kode: 'SS-2C3D-4E5F', status: 'dibatalkan' })
    const r = await verifikasi('SS-2C3D-4E5F')
    const teks = await r.clone().text()
    expect(r.status).toBe(200)
    expect(hasilVerifikasiSchema.parse(await r.json()).berlaku).toEqual({ status: 'dibatalkan', pada: '2026-09-20T10:00:00+07:00' })
    expect(teks).not.toContain('Alasan rahasia')
  })

  it('surat lewat masa berlaku Kedaluwarsa; tanpa batas selalu berlaku', async () => {
    await sisipSurat({ kode: 'SS-3D4E-5F6G', berlakuSampai: '2026-09-23' })
    await sisipSurat({ kode: 'SS-4E5F-6G7H', berlakuSampai: null })
    expect(hasilVerifikasiSchema.parse(await (await verifikasi('SS-3D4E-5F6G')).json()).berlaku).toEqual({ status: 'kedaluwarsa', sampai: '2026-09-23' })
    expect(hasilVerifikasiSchema.parse(await (await verifikasi('SS-4E5F-6G7H')).json()).berlaku).toEqual({ status: 'berlaku', sampai: null })
  })

  it('nama orang yang diterangkan dipakai bila ada subjek (bayi atau almarhum)', async () => {
    await sisipSurat({ kode: 'SS-5F6G-7H8J', subjek: 'pdk_zulkifli' })
    const nama = (await uji.sqlMigrasi`select nama from penduduk where id = 'pdk_zulkifli'`)[0].nama as string
    const hasil = hasilVerifikasiSchema.parse(await (await verifikasi('SS-5F6G-7H8J')).json())
    expect(hasil.nama.startsWith(nama.slice(0, 1))).toBe(true)
    expect(hasil.nama).not.toContain(nama)
  })

  it('surat dari jenis yang kemudian diarsipkan tetap ditemukan', async () => {
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
      values ('js_uji_arsip', ${ID_SUNGAI_SIALANG}, 'ARS', 'Jenis Arsip', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`
    await sisipSurat({ kode: 'SS-6G7H-8J9K', jenis: 'js_uji_arsip' })
    await uji.sqlMigrasi`update jenis_surat set diarsipkan = now(), aktif = false where id = 'js_uji_arsip'`
    const r = await verifikasi('SS-6G7H-8J9K')
    expect(r.status).toBe(200)
    expect(hasilVerifikasiSchema.parse(await r.json()).jenis).toBe('Jenis Arsip')
  })

  it('kode milik desa lain tidak ditemukan dan menaikkan pencacah desa alamat, bukan desa pemilik kode', async () => {
    await sisipSurat({ kode: 'XX-7H8J-9KAB', desa: DESA_X })
    const r = await verifikasi('XX-7H8J-9KAB')
    expect(r.status).toBe(404)
    expect((await galat(r)).message).toBe(PESAN_KODE_TIDAK_DITEMUKAN)
    expect(await cacahGagal(ID_SUNGAI_SIALANG)).toBe(1)
    expect(await cacahGagal(DESA_X)).toBe(0)
    expect((await verifikasi('XX-7H8J-9KAB', { basis: X, slug: 'desa-x' })).status).toBe(200)
  })

  it('alamat induk, slug yang tidak cocok dengan alamat, dan desa Persiapan menjawab 404 Website desa tidak ditemukan', async () => {
    await sisipSurat({ kode: 'SS-8J9K-ABCD' })
    for (const r of [
      await verifikasi('SS-8J9K-ABCD', { basis: 'http://sinfodes.localhost', slug: 'sungaisialang' }),
      await verifikasi('SS-8J9K-ABCD', { slug: 'desa-x' }),
      await verifikasi('SS-8J9K-ABCD', { slug: 'tidak-ada' }),
    ]) {
      expect(r.status).toBe(404)
      expect((await galat(r)).message).toBe('Website desa tidak ditemukan.')
    }
    await uji.sqlMigrasi`update desa set status = 'Persiapan' where id = ${DESA_X}`
    try {
      // Aplikasi baru: cache alamat 30 detik aplikasi lama masih menganggap desa ini Aktif.
      const baru = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => sekarang }).app
      const r = await kirimJson(baru, X, URL_V('desa-x'), { kode: 'XX-AAAA-BBBB' }, null, { 'X-Uji-Ip': ipBaru() })
      expect(r.status).toBe(404)
      expect((await galat(r)).message).toBe('Website desa tidak ditemukan.')
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${DESA_X}`
    }
  })

  it('tetap bekerja tanpa sesi dan dengan cookie panel (cookie diabaikan); desa Ditangguhkan tetap bisa diverifikasi', async () => {
    await sisipSurat({ kode: 'SS-9K2B-CDEF' })
    expect((await verifikasi('SS-9K2B-CDEF')).status).toBe(200)
    expect((await verifikasi('SS-9K2B-CDEF', { kuki: kukiOperator })).status).toBe(200)
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${ID_SUNGAI_SIALANG}`
    try {
      const baru = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => sekarang }).app
      const r = await kirimJson(baru, SS, URL_V('sungaisialang'), { kode: 'SS-9K2B-CDEF' }, null, { 'X-Uji-Ip': ipBaru() })
      expect(r.status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${ID_SUNGAI_SIALANG}`
    }
  })

  it('asal asing ditolak CSRF', async () => {
    const r = await app.fetch(
      new Request(`${SS}${URL_V('sungaisialang')}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://jahat.example', 'X-Uji-Ip': ipBaru() }, body: JSON.stringify({ kode: 'SS-AAAA-BBBB' }) }),
    )
    expect(r.status).toBe(403)
    expect((await galat(r)).message).toBe(PESAN_ASAL_DITOLAK)
    expect(await cacahGagal()).toBe(0)
  })

  it('badan rusak atau kode berbentuk salah 422 dan tidak dihitung', async () => {
    const rusak = await verifikasi(undefined, { badan: { bukanKode: 1 } })
    expect(rusak.status).toBe(422)
    const panjang = await verifikasi('A'.repeat(41))
    expect(panjang.status).toBe(422)
    const salah = await verifikasi('halo')
    expect(salah.status).toBe(422)
    expect(await galat(salah)).toMatchObject({ message: PESAN_KODE_FORMAT, fields: { kode: PESAN_KODE_FORMAT } })
    expect(await cacahGagal()).toBe(0)
  })
})

describe('POST /publik/:slug/verifikasi: pengunci (rencana 8F2b Tugas 8, Ruling 12)', () => {
  it('sembilan kode tidak ditemukan lalu kode benar: ditemukan', async () => {
    await sisipSurat({ kode: 'SS-AB2C-DE3F' })
    for (let i = 1; i <= 9; i++) expect((await verifikasi(kodeSalah(i))).status).toBe(404)
    expect((await verifikasi('SS-AB2C-DE3F')).status).toBe(200)
  })

  it('kode kesepuluh yang salah sudah 429; sesudahnya kode benar pun 429 dengan pesan terkunci; pencacah tersimpan walau jawaban 404', async () => {
    await sisipSurat({ kode: 'SS-BC3D-EF4G' })
    for (let i = 1; i <= 9; i++) expect((await verifikasi(kodeSalah(i))).status).toBe(404)
    expect(await cacahGagal()).toBe(9)
    const kesepuluh = await verifikasi(kodeSalah(10))
    expect(kesepuluh.status).toBe(429)
    expect((await galat(kesepuluh)).message).toBe(PESAN_VERIFIKASI_TERKUNCI)
    const benar = await verifikasi('SS-BC3D-EF4G')
    expect(benar.status).toBe(429)
    expect((await galat(benar)).message).toBe(PESAN_VERIFIKASI_TERKUNCI)
    expect((await uji.sqlMigrasi`select terkunci_sampai from percobaan_verifikasi where desa_id = ${ID_SUNGAI_SIALANG}`)[0].terkunci_sampai).not.toBeNull()
  })

  it('pulih sesudah sepuluh menit dengan hitungan kosong; desa lain tidak ikut terkunci', async () => {
    await sisipSurat({ kode: 'SS-CD4E-FG5H' })
    await sisipSurat({ kode: 'XX-CD4E-FG5H', desa: DESA_X })
    for (let i = 1; i <= 10; i++) await verifikasi(kodeSalah(i))
    expect((await verifikasi('SS-CD4E-FG5H')).status).toBe(429)
    expect((await verifikasi('XX-CD4E-FG5H', { basis: X, slug: 'desa-x' })).status).toBe(200)
    sekarang = new Date(SEKARANG_UJI.getTime() + BATAS_VERIFIKASI.kunciMs + 1000)
    expect((await verifikasi('SS-CD4E-FG5H')).status).toBe(200)
    expect(await cacahGagal()).toBe(0)
  })

  it('kegagalan lebih tua dari jendela sepuluh menit tidak dihitung', async () => {
    for (let i = 1; i <= 9; i++) await verifikasi(kodeSalah(i))
    sekarang = new Date(SEKARANG_UJI.getTime() + BATAS_VERIFIKASI.jendelaMs + 60_000)
    expect((await verifikasi(kodeSalah(20))).status).toBe(404)
    expect(await cacahGagal()).toBe(1)
  })

  it('dua belas tebakan salah serentak menghasilkan tepat satu kunci', async () => {
    const hasil = await Promise.all(Array.from({ length: 12 }, (_, i) => verifikasi(kodeSalah(100 + i))))
    const status = hasil.map((r) => r.status)
    expect(status.filter((s) => s === 404)).toHaveLength(BATAS_VERIFIKASI.gagal - 1)
    expect(status.filter((s) => s === 429)).toHaveLength(12 - (BATAS_VERIFIKASI.gagal - 1))
    const baris = await uji.sqlMigrasi`select cardinality(gagal_pada)::int as n, terkunci_sampai from percobaan_verifikasi where desa_id = ${ID_SUNGAI_SIALANG}`
    expect(baris).toHaveLength(1)
    expect(baris[0].n).toBe(0)
    expect(baris[0].terkunci_sampai).not.toBeNull()
  })

  it('pembatas per IP: permintaan ke-31 dalam semenit dari satu alamat 429, alamat lain tidak', async () => {
    await sisipSurat({ kode: 'SS-DE5F-GH6J' })
    const ip = ipBaru()
    const hasil: number[] = []
    for (let i = 0; i < 31; i++) hasil.push((await verifikasi('SS-DE5F-GH6J', { ip })).status)
    expect(hasil.slice(0, 30).every((s) => s === 200)).toBe(true)
    expect(hasil[30]).toBe(429)
    const r = await verifikasi('SS-DE5F-GH6J', { ip })
    expect((await galat(r)).message).toBe(PESAN_TERLALU_SERING)
    expect((await verifikasi('SS-DE5F-GH6J', { ip: ipBaru() })).status).toBe(200)
    sekarang = new Date(SEKARANG_UJI.getTime() + 61_000)
    expect((await verifikasi('SS-DE5F-GH6J', { ip })).status).toBe(200)
  })
})
