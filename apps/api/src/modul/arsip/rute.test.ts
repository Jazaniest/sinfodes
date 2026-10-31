import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { barisSuratKeluarSchema, suratMasukSchema, type SuratMasuk } from '@sinfodes/kontrak/surat/arsip'
import { PESAN_CATATAN_NIK } from '@sinfodes/kontrak/surat/permohonan'
import { ukuranKb } from '@sinfodes/kontrak/warga/foto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { jpegBuatan, pdfBuatan } from '../../../test/helpers/berkas-buatan'
import { ambil, rakitApp, sisipAksesUji, sisipSesiBantuanUji, sisipSesiUji, sisipSesiWargaUji } from '../../../test/rakit-app'
import { bersihkanMetadata } from '../../berkas/bersihkan'
import { CSP_BERKAS, PESAN_BERKAS_BANTUAN, PESAN_BERKAS_TIDAK_TERSIMPAN } from '../../berkas/jawab'
import type { Penyandi } from '../../kripto/penyandi'

const SS = 'http://sungaisialang.sinfodes.localhost'
const PESAN_TIDAK_BOLEH_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const PESAN_TIDAK_BOLEH_CATAT = 'Peran Anda tidak berhak mencatat surat masuk.'
const PESAN_DITANGGUHKAN = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'
const MB = 1024 * 1024

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
type Peran = 'operator' | 'sekdes' | 'kades' | 'kaur' | 'kadusSatu' | 'kadusDua' | 'bantuan' | 'bantuanTerbuka' | 'warga'
let kuki: Record<Peran, string>
const id = { a: '', b: '', c: '', d: '', e: '' }

let urutSalin = 0
const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const kode4 = (n: number) => Array.from({ length: 4 }, (_, i) => HURUF[Math.floor(n / HURUF.length ** i) % HURUF.length]).join('')
/** Salinan baris permohonan terbit semai dengan nilai yang ditimpa; nomor urut dan kode terbit dibuat unik kecuali ditentukan. */
const salinTerbit = async (seed: string, ubah: Record<string, unknown>): Promise<string> => {
  urutSalin += 1
  const baru = `srt_arsip_${urutSalin}`
  const otomatis = { id: baru, tahun: 2098, no_urut: 6000 + urutSalin, terbit_urut: 60_000 + urutSalin, terbit_kode: `ARS-${kode4(urutSalin)}-ZZZZ` }
  await uji.sqlMigrasi`insert into permohonan
    select (jsonb_populate_record(null::permohonan, to_jsonb(s) || ${uji.sqlMigrasi.json(otomatis)}::jsonb || ${uji.sqlMigrasi.json(ubah as never)}::jsonb)).*
    from permohonan s where s.id = ${seed}`
  return baru
}
const penandatangan = (peran: 'kades' | 'sekdes', nama: string) => ({ id: 'pgn_uji', nama, peran, nip: null })

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const dibuat = new Date(SEKARANG_UJI.getTime() - 3600_000)
  const sepuluhMenit = new Date(SEKARANG_UJI.getTime() - 600_000)
  const panel = async (penggunaId: string) => (await sisipSesiUji(uji.sqlMigrasi, { penggunaId, desaId: ID_SUNGAI_SIALANG, dibuat })).kuki
  await uji.sqlMigrasi`insert into pengguna (id, desa_id, nama, jabatan, peran, dusun_id, email, aktif, kata_sandi_hash, dibuat)
    values ('pgn_kadus_arsip', ${ID_SUNGAI_SIALANG}, 'Kadus Satu Uji', 'Kepala Dusun I', 'kadus', 'dsn_ss_1', 'kadus1@sungaisialang.desa.id', true, '$argon2id$x', now())`
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, sembunyikan: true, mulai: dibuat })
  const aksesTerbuka = await sisipAksesUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, sembunyikan: false, mulai: dibuat })
  kuki = {
    operator: await panel('pgn_rosmiati'), sekdes: await panel('pgn_hendri'), kades: await panel('pgn_nasir'), kaur: await panel('pgn_nurhayati'),
    kadusSatu: await panel('pgn_kadus_arsip'), kadusDua: await panel('pgn_sukardi'),
    bantuan: (await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, aksesId: akses.id, dibuat: sepuluhMenit })).kuki,
    bantuanTerbuka: (await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, aksesId: aksesTerbuka.id, dibuat: sepuluhMenit })).kuki,
    warga: (await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: 'pdk_siti_rahmah', desaId: ID_SUNGAI_SIALANG, dibuat })).kuki,
  }

  // Bahan surat keluar di Maret 2098 (tanpa baris semai): batas bulan WIB, urutan, jenis, penanda tangan, dan cakupan dusun.
  const seed = async (jenisId: string) => (await uji.sqlMigrasi`select id from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and status = 'selesai' and jenis_id = ${jenisId} order by id limit 1`)[0].id as string
  const skd = await seed('js_ss_skd')
  const sktm = await seed('js_ss_sktm')
  // a dan b sama-sama urut 5 (jenis berbeda): waktu terbit memutus seri. c urut 3 dibatalkan. d dan e di luar Maret menurut WIB.
  id.a = await salinTerbit(skd, {
    terbit_urut: 5, terbit_pada: '2098-03-01T00:00:30+07:00', terbit_penandatangan: penandatangan('sekdes', 'Hendri Saputra'), dusun_id: 'dsn_ss_1',
    pemohon_id: 'pdk_siti_rahmah', subjek_id: null, kanal: 'loket',
  })
  id.b = await salinTerbit(sktm, {
    terbit_urut: 5, terbit_pada: '2098-03-31T23:59:00+07:00', terbit_penandatangan: penandatangan('kades', 'H. Muhammad Nasir'), dusun_id: 'dsn_ss_2',
    pemohon_id: 'pdk_siti_rahmah', subjek_id: 'pdk_nur_aini', kanal: 'online',
  })
  id.c = await salinTerbit(skd, {
    terbit_urut: 3, terbit_pada: '2098-03-15T12:00:00+07:00', terbit_penandatangan: penandatangan('kades', 'H. Muhammad Nasir'), dusun_id: 'dsn_ss_1',
    pemohon_id: 'pdk_syahrial', subjek_id: null, status: 'dibatalkan',
    pembatalan: { oleh: { id: 'pgn_uji', nama: 'Petugas' }, pada: '2098-03-16T10:00:00+07:00', catatan: 'Salah ketik' },
  })
  id.d = await salinTerbit(skd, { terbit_urut: 9, terbit_pada: '2098-02-28T23:59:59+07:00', dusun_id: 'dsn_ss_1' })
  // Tepat 1 April 2098 00.00 WIB = 31 Maret 17.00 UTC: masuk April, bukan Maret.
  id.e = await salinTerbit(skd, { terbit_urut: 10, terbit_pada: '2098-03-31T17:00:00Z', dusun_id: 'dsn_ss_1' })
})
afterAll(async () => {
  await uji?.tutup()
})

const get = (jalur: string, k: string | null, aplikasi = app) => ambil(aplikasi, `${SS}/api/v1${jalur}`, k)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const daftarKeluar = daftarSchema(barisSuratKeluarSchema)
const daftarMasuk = daftarSchema(suratMasukSchema)
const keluar = async (kueri: string, k = kuki.operator) => {
  const res = await get(`/surat-keluar${kueri}`, k)
  expect(res.status, kueri).toBe(200)
  return daftarKeluar.parse(await res.json())
}

describe('GET /surat-keluar (8F3 Ruling 14)', () => {
  it('Maret 2098: hanya surat terbit bulan itu menurut WIB, urut nomor urut lalu waktu terbit; yang dibatalkan ikut', async () => {
    const hasil = await keluar('?bulan=2098-03')
    expect(hasil.data.map((b) => b.id)).toEqual([id.c, id.a, id.b])
    expect(hasil.meta).toEqual({ page: 1, pageSize: 25, total: 3 })
    expect(hasil.data.map((b) => b.status)).toEqual(['dibatalkan', 'selesai', 'selesai'])
    expect(hasil.data.map((b) => b.urut)).toEqual([3, 5, 5])
    expect(hasil.data.map((b) => b.tanggal)).toEqual(['2098-03-15', '2098-03-01', '2098-03-31'])
  })

  it('batas bulan menurut WIB: 28 Februari 23.59 di Februari; 31 Maret 17.00 UTC (1 April WIB) di April', async () => {
    expect((await keluar('?bulan=2098-02')).data.map((b) => b.id)).toEqual([id.d])
    expect((await keluar('?bulan=2098-04')).data.map((b) => b.id)).toEqual([id.e])
    expect((await keluar('?bulan=2098-05')).data).toEqual([])
  })

  it('bentuk baris: untuk = subjek bila ada kalau tidak pemohon, penanda tangan, kanal, jenis', async () => {
    const [c, a, b] = (await keluar('?bulan=2098-03')).data
    expect(a).toMatchObject({ untuk: 'Siti Rahmah', penandatangan: { nama: 'Hendri Saputra', peran: 'sekdes' }, kanal: 'loket', jenis: { kode: 'SKD' } })
    expect(b).toMatchObject({ untuk: 'Nur Aini', penandatangan: { nama: 'H. Muhammad Nasir', peran: 'kades' }, kanal: 'online', jenis: { kode: 'SKTM' } })
    expect(c.untuk).toBe('Syahrial')
  })

  it('filter jenis dan penanda tangan', async () => {
    expect((await keluar('?bulan=2098-03&jenis=SKD')).data.map((b) => b.id)).toEqual([id.c, id.a])
    expect((await keluar('?bulan=2098-03&jenis=SKTM')).data.map((b) => b.id)).toEqual([id.b])
    expect((await keluar('?bulan=2098-03&penandatangan=sekdes')).data.map((b) => b.id)).toEqual([id.a])
    expect((await keluar('?bulan=2098-03&penandatangan=kades')).data.map((b) => b.id)).toEqual([id.c, id.b])
    expect((await keluar('?bulan=2098-03&jenis=XYZ')).data).toEqual([])
  })

  it('bulan bawaan = bulan berjalan WIB; cocok dengan hitungan SQL independen atas data semai', async () => {
    const harapan = await uji.sqlMigrasi`select id from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and terbit_pada is not null
      and (terbit_pada at time zone 'Asia/Jakarta')::date >= '2026-09-01' and (terbit_pada at time zone 'Asia/Jakarta')::date < '2026-10-01'
      order by terbit_urut, terbit_pada, id`
    expect(harapan.length).toBeGreaterThan(0)
    const hasil = await keluar('?pageSize=100')
    expect(hasil.data.map((b) => b.id)).toEqual(harapan.map((b) => b.id as string))
    expect(hasil.meta.total).toBe(harapan.length)
  })

  it('halaman: pageSize memotong, meta total tetap; semua=1 tanpa halaman', async () => {
    const harapan = await uji.sqlMigrasi`select count(*)::int as n from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and terbit_pada is not null
      and (terbit_pada at time zone 'Asia/Jakarta')::date >= '2026-09-01' and (terbit_pada at time zone 'Asia/Jakarta')::date < '2026-10-01'`
    const total = harapan[0].n as number
    expect(total).toBeGreaterThan(25)
    const halaman2 = await keluar('?pageSize=25&page=2')
    expect(halaman2.meta).toEqual({ page: 2, pageSize: 25, total })
    expect(halaman2.data).toHaveLength(Math.min(25, total - 25))
    const semua = await keluar('?semua=1')
    expect(semua.data).toHaveLength(total)
    expect(semua.meta).toEqual({ page: 1, pageSize: total, total })
    expect((await keluar('?bulan=2098-05&semua=1')).meta).toEqual({ page: 1, pageSize: 1, total: 0 })
  })

  it('Kepala Dusun hanya surat dusunnya; peran lain seluruh desa', async () => {
    expect((await keluar('?bulan=2098-03', kuki.kadusSatu)).data.map((b) => b.id)).toEqual([id.c, id.a])
    expect((await keluar('?bulan=2098-03', kuki.kadusDua)).data.map((b) => b.id)).toEqual([id.b])
    for (const peran of ['sekdes', 'kades'] as const) expect((await keluar('?bulan=2098-03', kuki[peran])).data).toHaveLength(3)
  })

  it('format salah 422; Kaur Keuangan 403; tanpa sesi dan sesi warga 401; sesi bantuan boleh membaca', async () => {
    for (const kueri of ['?bulan=2098-13', '?bulan=bulanlalu', '?jenis=skd', '?penandatangan=operator', '?pageSize=7']) expect((await get(`/surat-keluar${kueri}`, kuki.operator)).status, kueri).toBe(422)
    const kaur = await get('/surat-keluar', kuki.kaur)
    expect(kaur.status).toBe(403)
    expect((await galat(kaur)).message).toBe(PESAN_TIDAK_BOLEH_LIHAT)
    expect((await get('/surat-keluar', null)).status).toBe(401)
    expect((await get('/surat-keluar', kuki.warga)).status).toBe(401)
    expect((await get('/surat-keluar?bulan=2098-03', kuki.bantuan)).status).toBe(200)
  })
})

type Isian = Partial<Record<'diterima' | 'nomor' | 'tanggalSurat' | 'pengirim' | 'perihal' | 'disposisiKepada' | 'disposisiInstruksi', string>>
const SAH: Required<Isian> = {
  diterima: '2020-05-12', nomor: '005/123/Kec-TM/2020', tanggalSurat: '2020-05-10', pengirim: 'Camat Teluk Meranti', perihal: 'Undangan rapat koordinasi',
  disposisiKepada: 'Sekretaris Desa', disposisiInstruksi: 'Hadiri dan laporkan.',
}
type Pindaian = { isi: Buffer; nama: string; tipe?: string }
async function catat(isian: Isian, scan: Pindaian | null = null, k: string | null = kuki.operator, tambahan: Record<string, string> = {}, aplikasi = app): Promise<Response> {
  const form = new FormData()
  for (const [kunci, nilai] of Object.entries({ ...SAH, ...isian })) form.append(kunci, nilai ?? '')
  if (scan) form.append('scan', new File([scan.isi], scan.nama, { type: scan.tipe ?? 'application/pdf' }))
  return aplikasi.fetch(new Request(`${SS}/api/v1/surat-masuk`, { method: 'POST', headers: { Origin: SS, ...(k ? { Cookie: k } : {}), ...tambahan }, body: form }))
}
const jumlah = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const catatOk = async (isian: Isian, scan: Pindaian | null = null): Promise<SuratMasuk> => {
  const res = await catat(isian, scan)
  expect(res.status, JSON.stringify(await res.clone().json().catch(() => null))).toBe(201)
  return suratMasukSchema.parse(await res.json())
}
const tolak = async (isian: Isian, scan: Pindaian | null, status: number) => {
  const sebelum = [await jumlah('surat_masuk'), await jumlah('berkas_surat')]
  const res = await catat(isian, scan)
  expect(res.status, JSON.stringify(await res.clone().json().catch(() => null))).toBe(status)
  expect([await jumlah('surat_masuk'), await jumlah('berkas_surat')]).toEqual(sebelum)
  return res
}

describe('POST /surat-masuk (catat)', () => {
  it('Operator mencatat tanpa pindaian: 201, nomor agenda berikutnya di tahun terima, dicatat oleh pelaku, disposisi tersimpan', async () => {
    const [{ n }] = await uji.sqlMigrasi`select coalesce(max(no_agenda), 0)::int as n from surat_masuk where desa_id = ${ID_SUNGAI_SIALANG} and tahun = 2020`
    const baru = await catatOk({})
    expect(baru).toMatchObject({
      desaId: ID_SUNGAI_SIALANG, noAgenda: n + 1, diterima: '2020-05-12', nomor: SAH.nomor, tanggalSurat: '2020-05-10', pengirim: SAH.pengirim, perihal: SAH.perihal,
      scan: null, disposisi: { kepada: 'Sekretaris Desa', instruksi: 'Hadiri dan laporkan.' }, dicatat: { oleh: { id: 'pgn_rosmiati', nama: expect.any(String) }, pada: '2026-09-24T09:00:00+07:00' },
    })
    const lagi = await catatOk({ nomor: '005/124/Kec-TM/2020' })
    expect(lagi.noAgenda).toBe(n + 2)
  })

  it('tanpa disposisi: disposisi null; Sekretaris Desa juga boleh mencatat', async () => {
    const res = await catat({ disposisiKepada: '', disposisiInstruksi: '' }, null, kuki.sekdes)
    expect(res.status).toBe(201)
    expect(suratMasukSchema.parse(await res.json()).disposisi).toBeNull()
  })

  it('dengan pindaian PDF: nama dibersihkan, ukuran dari isi, satu baris berkas_surat tipe scan tersandi; JPEG dibersihkan dari EXIF', async () => {
    const pdf = pdfBuatan('/Info (rahasia-pdf-ARSIP)')
    const baru = await catatOk({ diterima: '2020-06-01', tanggalSurat: '2020-06-01' }, { isi: pdf, nama: 'C:\\kantor\\Surat Undangan.pdf' })
    expect(baru.scan).toEqual({ berkas: 'Surat Undangan.pdf', ukuranKb: ukuranKb(pdf.length) })
    const [b] = await uji.sqlMigrasi`select id, jenis, tipe, ukuran_byte, surat_masuk_id, permohonan_id, isi from berkas_surat where surat_masuk_id = ${baru.id}`
    expect(b).toMatchObject({ id: `scn_${baru.id}`, jenis: 'scan', tipe: 'application/pdf', ukuran_byte: pdf.length, permohonan_id: null })
    expect((b.isi as Buffer).includes(Buffer.from('rahasia-pdf-ARSIP'))).toBe(false)

    const jpeg = jpegBuatan({ exif: true })
    const dua = await catatOk({ diterima: '2020-06-02', tanggalSurat: '2020-06-02' }, { isi: jpeg, nama: 'foto.JPG', tipe: 'image/jpeg' })
    expect(dua.scan?.berkas).toBe('foto.JPG')
    const res = await get(`/surat-masuk/${dua.id}/scan`, kuki.operator)
    expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), bersihkanMetadata(jpeg, 'image/jpeg'))).toBe(0)
  })

  it('pindaian tepat 5 MB diterima', async () => {
    const pas = Buffer.concat([pdfBuatan(), Buffer.alloc(5 * MB - pdfBuatan().length, 0x20)])
    expect(pas.length).toBe(5 * MB)
    const baru = await catatOk({ diterima: '2020-06-03', tanggalSurat: '2020-06-03' }, { isi: pas, nama: 'besar.pdf' })
    expect(baru.scan?.ukuranKb).toBe(5 * 1024)
  })

  it('pindaian ditolak 422 pada scan tanpa menyimpan apa pun: ekstensi salah, isi bukan PDF/JPG/PNG, 5 MB + 1 byte, PDF aktif', async () => {
    const kasus: [string, Pindaian][] = [
      ['ekstensi salah', { isi: pdfBuatan(), nama: 'surat.exe' }],
      ['HTML bernama pdf', { isi: Buffer.from('<html><script>alert(1)</script></html>'), nama: 'surat.pdf' }],
      ['GIF', { isi: Buffer.from('GIF89a.....'), nama: 'surat.png', tipe: 'image/gif' }],
      ['5 MB + 1 byte', { isi: Buffer.concat([pdfBuatan(), Buffer.alloc(5 * MB - pdfBuatan().length + 1, 0x20)]), nama: 'besar.pdf' }],
      ['PDF aktif', { isi: pdfBuatan('/OpenAction 3 0 R'), nama: 'aktif.pdf' }],
      ['kosong', { isi: Buffer.alloc(0), nama: 'kosong.pdf' }],
    ]
    for (const [nama, scan] of kasus) {
      const res = await tolak({}, scan, 422)
      expect(Object.keys((await galat(res)).fields ?? {}), nama).toEqual(['scan'])
    }
  })

  it('isian tidak sah: tanggal terima esok hari, tanggal surat sesudah terima, 16 angka di bidang teks, bidang wajib kosong', async () => {
    const esok = await tolak({ diterima: '2026-09-25', tanggalSurat: '2026-09-24' }, null, 422)
    expect((await galat(esok)).fields).toEqual({ diterima: 'Tanggal terima tidak boleh sesudah hari ini' })
    const urutan = await tolak({ diterima: '2020-05-12', tanggalSurat: '2020-05-13' }, null, 422)
    expect((await galat(urutan)).fields).toHaveProperty('tanggalSurat')
    for (const bidang of ['nomor', 'pengirim', 'perihal', 'disposisiInstruksi'] as const) {
      const res = await tolak({ [bidang]: 'ref 3175010101010001 selesai' }, null, 422)
      expect((await galat(res)).fields).toEqual({ [bidang]: PESAN_CATATAN_NIK })
    }
    const kosong = await tolak({ nomor: '', pengirim: '' }, null, 422)
    expect(Object.keys((await galat(kosong)).fields ?? {}).sort()).toEqual(['nomor', 'pengirim'])
  })

  it('nama pindaian dengan 16 angka diganti scan + ekstensi', async () => {
    const baru = await catatOk({ diterima: '2020-06-04', tanggalSurat: '2020-06-04' }, { isi: pdfBuatan(), nama: 'KTP 3175010101010001.pdf' })
    expect(baru.scan?.berkas).toBe('scan.pdf')
  })

  it('hak: Kepala Desa, Kepala Dusun, Kaur Keuangan 403; tanpa sesi dan warga 401; sesi bantuan hanya melihat', async () => {
    const sebelum = await jumlah('surat_masuk')
    for (const peran of ['kades', 'kadusSatu', 'kaur'] as const) {
      const res = await catat({}, null, kuki[peran])
      expect(res.status, peran).toBe(403)
      if (peran !== 'kaur') expect((await galat(res)).message).toBe(PESAN_TIDAK_BOLEH_CATAT)
    }
    expect((await catat({}, null, null)).status).toBe(401)
    expect((await catat({}, null, kuki.warga)).status).toBe(401)
    expect((await catat({}, null, kuki.bantuan)).status).toBe(403)
    expect(await jumlah('surat_masuk')).toBe(sebelum)
  })

  it('desa Ditangguhkan: 403 tanpa menulis; membaca tetap jalan', async () => {
    try {
      await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${ID_SUNGAI_SIALANG}`
      const { app: baru } = rakitApp({ klien: uji.klien, penyandi })
      const sebelum = await jumlah('surat_masuk')
      const res = await catat({}, null, kuki.operator, {}, baru)
      expect(res.status).toBe(403)
      expect((await galat(res)).message).toBe(PESAN_DITANGGUHKAN)
      expect(await jumlah('surat_masuk')).toBe(sebelum)
      expect((await get('/surat-masuk', kuki.operator, baru)).status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${ID_SUNGAI_SIALANG}`
    }
  })

  it('badan di atas 6 MB atau Content-Length palsu: 413 sebelum menulis', async () => {
    const sebelum = [await jumlah('surat_masuk'), await jumlah('berkas_surat')]
    const besar = Buffer.concat([pdfBuatan(), Buffer.alloc(7 * MB, 0x20)])
    expect((await catat({}, { isi: besar, nama: 'raksasa.pdf' })).status).toBe(413)
    expect((await catat({}, null, kuki.operator, { 'Content-Length': String(40 * MB) })).status).toBe(413)
    expect([await jumlah('surat_masuk'), await jumlah('berkas_surat')]).toEqual(sebelum)
  })
})

describe('nomor agenda surat masuk (8F3 Ruling 14, fokus review 8)', () => {
  it('20 pencatatan serentak pada tahun yang sama menghasilkan nomor 1-20 tanpa ganda', async () => {
    const hasil = await Promise.all(Array.from({ length: 20 }, (_, i) => catat({ diterima: '2021-06-15', tanggalSurat: '2021-06-14', nomor: `2021/${i}` })))
    expect(hasil.map((r) => r.status)).toEqual(Array(20).fill(201))
    const nomor = (await Promise.all(hasil.map(async (r) => suratMasukSchema.parse(await r.json()).noAgenda))).sort((a, b) => a - b)
    expect(nomor).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('tanggal terima 31 Desember dan 1 Januari memulai ulang di 1 pada tahun masing-masing', async () => {
    const desember = await catatOk({ diterima: '2023-12-31', tanggalSurat: '2023-12-30' })
    const januari = await catatOk({ diterima: '2024-01-01', tanggalSurat: '2023-12-31' })
    expect([desember.noAgenda, januari.noAgenda]).toEqual([1, 1])
    expect((await catatOk({ diterima: '2024-01-02', tanggalSurat: '2024-01-02' })).noAgenda).toBe(2)
  })

  it('bukti kunci: pencatatan menunggu kunci agenda desa dan tahun yang ditahan, lalu berjalan', async () => {
    let selesai = 0
    let jawaban: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${`surat-masuk-agenda:${ID_SUNGAI_SIALANG}:2022`}, 0))`
      jawaban = catat({ diterima: '2022-03-03', tanggalSurat: '2022-03-03' }).then((r) => (selesai++, r))
      await new Promise((r) => setTimeout(r, 600))
      expect(selesai).toBe(0)
    })
    expect(((await jawaban) as Response).status).toBe(201)
  })
})

describe('GET /surat-masuk (daftar) dan GET /surat-masuk/:id/scan', () => {
  it('daftar bulan terima menurut WIB: urut tanggal terima lalu nomor agenda; Kepala Dusun melihat seluruh register', async () => {
    const hasil = daftarMasuk.parse(await (await get('/surat-masuk?bulan=2020-05', kuki.operator)).json())
    expect(hasil.data.length).toBeGreaterThanOrEqual(3)
    expect(hasil.data.every((s) => s.diterima.startsWith('2020-05'))).toBe(true)
    const kunci = hasil.data.map((s) => `${s.diterima}|${String(s.noAgenda).padStart(6, '0')}`)
    expect([...kunci].sort()).toEqual(kunci)
    const kadus = daftarMasuk.parse(await (await get('/surat-masuk?bulan=2020-05', kuki.kadusSatu)).json())
    expect(kadus.data.map((s) => s.id)).toEqual(hasil.data.map((s) => s.id))
  })

  it('bulan bawaan = bulan berjalan; cocok dengan SQL atas data semai; halaman', async () => {
    const harapan = await uji.sqlMigrasi`select id from surat_masuk where desa_id = ${ID_SUNGAI_SIALANG} and diterima >= '2026-09-01' and diterima < '2026-10-01' order by diterima, no_agenda`
    const hasil = daftarMasuk.parse(await (await get('/surat-masuk?pageSize=100', kuki.operator)).json())
    expect(hasil.data.map((s) => s.id)).toEqual(harapan.map((b) => b.id as string))
    expect(hasil.meta.total).toBe(harapan.length)
    const dua = daftarMasuk.parse(await (await get('/surat-masuk?bulan=2021-06&pageSize=25&page=1', kuki.operator)).json())
    expect(dua.meta).toEqual({ page: 1, pageSize: 25, total: 20 })
    expect(dua.data).toHaveLength(20)
  })

  it('format bulan salah 422; Kaur Keuangan 403; tanpa sesi 401', async () => {
    expect((await get('/surat-masuk?bulan=2020-13', kuki.operator)).status).toBe(422)
    expect((await get('/surat-masuk', kuki.kaur)).status).toBe(403)
    expect((await get('/surat-masuk', null)).status).toBe(401)
  })

  it('pindaian dibuka petugas yang boleh melihat (juga Kepala Dusun): tipe tetap, nosniff, CSP berkas, unduhan untuk PDF', async () => {
    const pdf = pdfBuatan('/Info (buka-pindaian)')
    const baru = await catatOk({ diterima: '2020-07-01', tanggalSurat: '2020-07-01' }, { isi: pdf, nama: 'Undangan Camat.pdf' })
    for (const peran of ['operator', 'sekdes', 'kades', 'kadusSatu', 'kadusDua'] as const) {
      const res = await get(`/surat-masuk/${baru.id}/scan`, kuki[peran])
      expect(res.status, peran).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/pdf')
      expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="Undangan Camat.pdf"')
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('Content-Security-Policy')).toBe(CSP_BERKAS)
      expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), pdf)).toBe(0)
    }
  })

  it('pindaian: sesi bantuan 403 (juga tanpa penyamaran), Kaur Keuangan 403, tanpa sesi dan warga 401', async () => {
    const baru = await catatOk({ diterima: '2020-07-02', tanggalSurat: '2020-07-02' }, { isi: pdfBuatan(), nama: 'a.pdf' })
    for (const k of [kuki.bantuan, kuki.bantuanTerbuka]) {
      const res = await get(`/surat-masuk/${baru.id}/scan`, k)
      expect(res.status).toBe(403)
      expect((await galat(res)).message).toBe(PESAN_BERKAS_BANTUAN)
    }
    expect((await get(`/surat-masuk/${baru.id}/scan`, kuki.kaur)).status).toBe(403)
    expect((await get(`/surat-masuk/${baru.id}/scan`, null)).status).toBe(401)
    expect((await get(`/surat-masuk/${baru.id}/scan`, kuki.warga)).status).toBe(401)
  })

  it('surat masuk data contoh (hanya nama dan ukuran) 404 "Berkas tidak tersimpan."; tanpa pindaian dan id tak dikenal juga 404', async () => {
    const [contoh] = await uji.sqlMigrasi`select id from surat_masuk s where desa_id = ${ID_SUNGAI_SIALANG} and scan_nama is not null
      and not exists (select 1 from berkas_surat b where b.surat_masuk_id = s.id) order by id limit 1`
    const tanpaIsi = await get(`/surat-masuk/${contoh.id}/scan`, kuki.operator)
    expect(tanpaIsi.status).toBe(404)
    expect((await galat(tanpaIsi)).message).toBe(PESAN_BERKAS_TIDAK_TERSIMPAN)
    const [tanpaScan] = await uji.sqlMigrasi`select id from surat_masuk where desa_id = ${ID_SUNGAI_SIALANG} and scan_nama is null order by id limit 1`
    expect((await get(`/surat-masuk/${tanpaScan.id}/scan`, kuki.operator)).status).toBe(404)
    expect((await get('/surat-masuk/sm_tidak_ada/scan', kuki.operator)).status).toBe(404)
  })
})
