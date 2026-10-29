import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { jenisSuratSchema, type JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import { salinTataLetak, samaDenganSiap, TATA_LETAK_SIAP } from '@sinfodes/kontrak/surat/tata-letak-siap'
import { detailJenisSuratSchema } from '@sinfodes/kontrak/surat/ubah-jenis'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimDenganMetode, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const TIDAK_DITEMUKAN = 'Jenis surat tidak ditemukan.'
const PESAN_BAWAAN = 'Jenis bawaan tidak bisa dihapus atau diarsipkan.'
const PESAN_UBAH = 'Peran Anda tidak berhak mengubah jenis surat.'
const PESAN_ARSIP = 'Jenis ini diarsipkan. Aktifkan lagi sebelum mengubahnya.'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let penyandi: Awaited<ReturnType<typeof penyandiUji>>
const kuki: Record<string, string> = {}
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const akun: [string, string, string][] = [
    ['operator', SS, 'rosmiati@sungaisialang.desa.id'], ['sekdes', SS, 'hendri@sungaisialang.desa.id'], ['kades', SS, 'kades@sungaisialang.desa.id'],
    ['kaur', SS, 'nurhayati@sungaisialang.desa.id'], ['kadus', SS, 'sukardi@sungaisialang.desa.id'], ['operatorTl', TL, 'operator@tanjunglamo.desa.id'],
  ]
  for (const [i, [nama, basis, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, basis, surel, 'demo', `10.9.0.${i + 1}`)).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

const katalogSs = () => dunia.jenisSurat.filter((j) => j.desaId === ID_SUNGAI_SIALANG)
const bawaanSs = () => katalogSs()[0]
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const tambah = (badan: unknown, peran = 'operator', basis = SS) => kirimJson(app, basis, '/api/v1/jenis-surat', badan, kuki[peran])
const ubah = (id: string, badan: unknown, peran = 'operator', basis = SS) => kirimDenganMetode(app, 'PATCH', basis, `/api/v1/jenis-surat/${id}`, badan, kuki[peran])
const hapus = (id: string, peran = 'operator', basis = SS) => kirimDenganMetode(app, 'DELETE', basis, `/api/v1/jenis-surat/${id}`, undefined, kuki[peran])
const aksi = (id: string, nama: 'arsipkan' | 'aktifkan-lagi', peran = 'operator', basis = SS) => kirimJson(app, basis, `/api/v1/jenis-surat/${id}/${nama}`, {}, kuki[peran])
const baris = async (id: string) => (await uji.sqlMigrasi`select * from jenis_surat where id = ${id}`)[0]
const jumlahBaris = async (desaId = ID_SUNGAI_SIALANG) => Number((await uji.sqlMigrasi`select count(*)::int as n from jenis_surat where desa_id = ${desaId}`)[0].n)
const salinKatalog = async (desaId: string) => (await uji.sqlMigrasi`select * from jenis_surat where desa_id = ${desaId} order by urutan`).map((b) => JSON.stringify(b))
/** Membuat jenis buatan desa dan mengembalikan jenisnya. */
async function buat(kode: string, o: { dari?: string | null; nama?: string } = {}): Promise<JenisSurat> {
  const r = await tambah({ dari: o.dari ?? null, kode, nama: o.nama ?? `Jenis ${kode}` })
  expect(r.status).toBe(201)
  return jenisSuratSchema.parse(await r.json())
}
const tunda = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Menahan transaksi uji yang menulis sesuatu tanpa commit, sampai `selesaikan` dipanggil. */
async function tahan(tulis: (sql: typeof uji.sqlMigrasi) => Promise<unknown>): Promise<{ selesaikan: () => Promise<void> }> {
  const sambungan = await uji.sqlMigrasi.reserve()
  await sambungan`begin`
  await tulis(sambungan as unknown as typeof uji.sqlMigrasi)
  return {
    selesaikan: async () => {
      await sambungan`commit`
      sambungan.release()
    },
  }
}

describe('POST /jenis-surat (rencana 8F1 Tugas 5)', () => {
  it('jenis kosong: buatan desa, mati, klasifikasi 470, id js_, tersimpan di urutan terakhir katalog', async () => {
    const jenis = await buat('KOS', { nama: '  Surat kosong  ' })
    expect(jenis).toMatchObject({ desaId: ID_SUNGAI_SIALANG, kode: 'KOS', nama: 'Surat kosong', asal: 'desa', aktif: false, diarsipkan: null, klasifikasi: '470', tataLetak: null })
    expect(jenis.id).toMatch(/^js_[0-9a-f-]{36}$/)
    const akhir = (await uji.sqlMigrasi`select id from jenis_surat where desa_id = ${ID_SUNGAI_SIALANG} order by urutan desc limit 1`)[0]
    expect(akhir.id).toBe(jenis.id)
  })

  it('salinan: salinan dalam yang mati dan buatan desa; mengubah salinan tidak mengubah sumber', async () => {
    const sumber = bawaanSs()
    const salinan = await buat('SLN', { dari: sumber.id })
    expect(salinan).toMatchObject({ kode: 'SLN', nama: 'Jenis SLN', aktif: false, asal: 'desa', diarsipkan: null, klasifikasi: sumber.klasifikasi, teks: sumber.teks })
    expect(salinan.isian).toEqual(sumber.isian)
    expect(salinan.id).not.toBe(sumber.id)
    const r = await ubah(salinan.id, { teks: 'Teks salinan yang berbeda.', syarat: ['Hanya satu'] })
    expect(r.status).toBe(200)
    const asli = await baris(sumber.id)
    expect(asli.teks).toBe(sumber.teks)
    expect(asli.syarat).toEqual(sumber.syarat)
  })

  it('menyalin jenis yang sudah diarsipkan sah dan hasilnya mati', async () => {
    const arsip = await buat('SAR')
    expect((await aksi(arsip.id, 'arsipkan')).status).toBe(200)
    const salinan = await buat('SAS', { dari: arsip.id })
    expect(salinan).toMatchObject({ aktif: false, diarsipkan: null, asal: 'desa' })
  })

  it('sumber salinan tidak ada atau milik desa lain: 404 "Jenis surat tidak ditemukan."', async () => {
    const milikTl = dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo') as JenisSurat
    const sebelum = await jumlahBaris()
    for (const dari of ['js_tidak_ada', milikTl.id]) {
      const r = await tambah({ dari, kode: 'NOP', nama: 'Tidak jadi' })
      expect(r.status, dari).toBe(404)
      expect(await galat(r)).toMatchObject({ code: 'NOT_FOUND', message: TIDAK_DITEMUKAN })
    }
    expect(await jumlahBaris()).toBe(sebelum)
  })

  it('kode yang dipakai jenis lain, termasuk jenis bawaan dan jenis arsip: 422 pada field kode', async () => {
    const arsip = await buat('KAR')
    await aksi(arsip.id, 'arsipkan')
    for (const kode of [bawaanSs().kode, 'KAR']) {
      const r = await tambah({ dari: null, kode, nama: 'Kembar' })
      expect(r.status, kode).toBe(422)
      expect(await galat(r), kode).toMatchObject({ code: 'VALIDATION', fields: { kode: 'Kode sudah dipakai jenis surat lain.' } })
    }
  })

  it('desa lain boleh memakai kode yang sama', async () => {
    expect((await tambah({ dari: null, kode: 'SAM', nama: 'Milik Sungai Sialang' })).status).toBe(201)
    const r = await tambah({ dari: null, kode: 'SAM', nama: 'Milik Tanjung Lamo' }, 'operatorTl', TL)
    expect(r.status).toBe(201)
    expect(jenisSuratSchema.parse(await r.json())).toMatchObject({ kode: 'SAM', desaId: 'desa_tanjung_lamo' })
  })

  it('kode dan nama tidak valid: 422 per field, tidak ada yang tersimpan', async () => {
    const sebelum = await jumlahBaris()
    for (const kode of ['a', 'sk', 'S', 'ABCDEF', 'AB1', 'A-B', '', ' SKD ']) {
      const r = await tambah({ dari: null, kode, nama: 'Nama' })
      expect(r.status, `kode "${kode}"`).toBe(422)
      expect((await galat(r)).fields, `kode "${kode}"`).toHaveProperty('kode')
    }
    for (const nama of ['', '   ']) {
      const r = await tambah({ dari: null, kode: 'NAM', nama })
      expect(r.status).toBe(422)
      expect((await galat(r)).fields).toHaveProperty('nama')
    }
    for (const badan of [{}, { kode: 'NAM', nama: 'x' }, null, [], 'teks']) expect((await tambah(badan)).status, JSON.stringify(badan)).toBe(422)
    expect(await jumlahBaris()).toBe(sebelum)
  })

  it('dua POST serentak dengan kode sama: satu menang, yang lain 422 pada kode (bukan 500)', async () => {
    // Transaksi uji menyisipkan kode yang sama tanpa commit: pemeriksaan awal belum melihatnya, sisipan permintaan menunggu indeks unik.
    const penahan = await tahan((s) => s`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
      values ('js_penahan', ${ID_SUNGAI_SIALANG}, 'RAC', 'Penahan', '470', 'pemohon', '[]'::jsonb, false, false, false, '[]'::jsonb, 'Teks', false, 'desa')`)
    const permintaan = tambah({ dari: null, kode: 'RAC', nama: 'Pesaing' })
    await tunda(600)
    await penahan.selesaikan()
    const r = await permintaan
    expect(r.status).toBe(422)
    expect(await galat(r)).toMatchObject({ code: 'VALIDATION', fields: { kode: 'Kode sudah dipakai jenis surat lain.' } })
    const sisa = await uji.sqlMigrasi`select id from jenis_surat where desa_id = ${ID_SUNGAI_SIALANG} and kode = 'RAC'`
    expect(sisa.map((b) => b.id)).toEqual(['js_penahan'])
  })

  it('hak: Kepala Desa, Kepala Dusun, dan Kaur Keuangan 403; tanpa sesi 401; tidak ada baris dibuat', async () => {
    const sebelum = await jumlahBaris()
    for (const peran of ['kades', 'kadus', 'kaur']) {
      const r = await tambah({ dari: null, kode: 'HAK', nama: 'Tidak boleh' }, peran)
      expect(r.status, peran).toBe(403)
      expect(await galat(r), peran).toMatchObject({ code: 'FORBIDDEN', message: PESAN_UBAH })
    }
    expect((await kirimJson(app, SS, '/api/v1/jenis-surat', { dari: null, kode: 'HAK', nama: 'x' })).status).toBe(401)
    expect(await jumlahBaris()).toBe(sebelum)
  })

  it('desa Ditangguhkan: tulis ditolak, membaca tetap boleh', async () => {
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = 'desa_tanjung_lamo'`
    try {
      const { app: baru } = rakitApp({ klien: uji.klien, penyandi })
      const r = await kirimJson(baru, TL, '/api/v1/jenis-surat', { dari: null, kode: 'TGG', nama: 'Tangguh' }, kuki.operatorTl)
      expect(r.status).toBe(403)
      expect(await galat(r)).toMatchObject({ message: 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.' })
      expect((await ambil(baru, `${TL}/api/v1/jenis-surat`, kuki.operatorTl)).status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = 'desa_tanjung_lamo'`
    }
  })
})

describe('PATCH /jenis-surat/:id (rencana 8F1 Tugas 5)', () => {
  const ISIAN_USAHA = { kunci: 'namaUsaha', label: 'Nama usaha', jenis: 'teks', wajib: true, pilihan: null, rupiah: false, diTabel: false, keterangan: null }

  it('hanya kolom yang dikirim berubah; spasi tepi dibuang; hasilnya detail jenis', async () => {
    const jenis = await buat('PAT')
    const r = await ubah(jenis.id, { nama: '  Nama Baru  ', syarat: ['  KTP-el  ', 'KK'], klasifikasi: ' 474.1 ', online: true })
    expect(r.status).toBe(200)
    const badan = detailJenisSuratSchema.parse(await r.json())
    expect(badan.jenis).toMatchObject({ id: jenis.id, nama: 'Nama Baru', syarat: ['KTP-el', 'KK'], klasifikasi: '474.1', online: true, jumlahPakai: 0, dipakai: false })
    expect(badan.jenis.teks).toBe(jenis.teks)
    expect(badan.jenis.kode).toBe('PAT')
    expect(badan.contoh.pemohon.nik).toBeNull()
    const b = await baris(jenis.id)
    expect(b).toMatchObject({ nama: 'Nama Baru', klasifikasi: '474.1', online: true, aktif: false, asal: 'desa', kode: 'PAT' })
  })

  it('isian: pilihan hanya dipertahankan untuk jenis pilihan; label dipangkas; pilihan kosong dibuang', async () => {
    const jenis = await buat('ISI')
    const isian = [
      { ...ISIAN_USAHA, pilihan: ['seharusnya dibuang'] },
      { ...ISIAN_USAHA, kunci: 'jenisUsaha', label: ' Jenis usaha ', jenis: 'pilihan', pilihan: [' Dagang ', ' ', 'Jasa'] },
    ]
    const r = await ubah(jenis.id, { isian, teks: 'Usaha [namaUsaha] jenis [jenisUsaha] milik [nama].' })
    expect(r.status).toBe(200)
    const tersimpan = jenisSuratSchema.parse((detailJenisSuratSchema.parse(await r.json())).jenis).isian
    expect(tersimpan[0]).toMatchObject({ kunci: 'namaUsaha', pilihan: null })
    expect(tersimpan[1]).toMatchObject({ kunci: 'jenisUsaha', label: 'Jenis usaha', pilihan: ['Dagang', 'Jasa'] })
  })

  it('nilai siap palsu dihitung ulang server; tataLetak null mengembalikan jenis mengikuti desa', async () => {
    const jenis = await buat('TLT')
    const rapi = salinTataLetak(TATA_LETAK_SIAP['dua-lambang'])
    const palsu = { ...rapi, siap: 'standar' }
    let r = await ubah(jenis.id, { tataLetak: palsu })
    expect(r.status).toBe(200)
    expect((await baris(jenis.id)).tata_letak.siap).toBe(samaDenganSiap(rapi))
    expect((await baris(jenis.id)).tata_letak.siap).toBe('dua-lambang')
    const diubah = { ...rapi, kertas: { ...rapi.kertas, ukuran: rapi.kertas.ukuran === 'A4' ? 'F4' : 'A4' }, siap: 'dua-lambang' }
    r = await ubah(jenis.id, { tataLetak: diubah })
    expect(r.status).toBe(200)
    expect((await baris(jenis.id)).tata_letak.siap).toBeNull()
    r = await ubah(jenis.id, { tataLetak: null })
    expect(r.status).toBe(200)
    expect((await baris(jenis.id)).tata_letak).toBeNull()
  })

  it('tataLetak yang bentuknya salah ditolak 422 dan tidak mengubah apa pun', async () => {
    const jenis = await buat('TLX')
    const sebelum = JSON.stringify(await baris(jenis.id))
    const r = await ubah(jenis.id, { tataLetak: { kertas: 'bukan objek' } })
    expect(r.status).toBe(422)
    expect(JSON.stringify(await baris(jenis.id))).toBe(sebelum)
  })

  it('isi yang melanggar aturan: 422 dengan field per kunci, tidak ada yang tersimpan separuh', async () => {
    const jenis = await buat('LGR')
    const sebelum = JSON.stringify(await baris(jenis.id))
    const kasus: [string, unknown, string][] = [
      ['sisipan tak dikenal', { teks: 'Halo [xyz].' }, 'teks'],
      ['teks kosong', { teks: '   ' }, 'teks'],
      ['nama kosong', { nama: '  ' }, 'nama'],
      ['klasifikasi bukan tiga angka', { klasifikasi: '47' }, 'klasifikasi'],
      ['masa berlaku nol', { masaBerlakuBulan: 0 }, 'masaBerlakuBulan'],
      ['masa berlaku lebih dari 60', { masaBerlakuBulan: 61 }, 'masaBerlakuBulan'],
      ['syarat kosong', { syarat: ['KTP', ' '] }, 'syarat.1'],
      ['pilihan kurang dari dua', { isian: [{ ...ISIAN_USAHA, jenis: 'pilihan', pilihan: ['Satu', ' '] }], teks: 'Halo [namaUsaha].' }, 'isian.0.pilihan'],
      ['label isian kosong', { isian: [{ ...ISIAN_USAHA, label: ' ' }], teks: 'Halo [namaUsaha].' }, 'isian.0.label'],
      ['kunci isian bentrok dengan sisipan umum', { isian: [{ ...ISIAN_USAHA, kunci: 'nama' }], teks: 'Halo [nama].' }, 'isian.0.label'],
      ['kunci isian kembar', { isian: [ISIAN_USAHA, { ...ISIAN_USAHA, label: 'Lain' }], teks: 'Halo [namaUsaha].' }, 'isian.1.label'],
    ]
    for (const [nama, badan, kunci] of kasus) {
      const r = await ubah(jenis.id, badan)
      expect(r.status, nama).toBe(422)
      const e = await galat(r)
      expect(e.fields, nama).toHaveProperty([kunci])
    }
    const masaPecahan = await ubah(jenis.id, { masaBerlakuBulan: 1.5 })
    expect(masaPecahan.status).toBe(422)
    expect((await galat(masaPecahan)).fields).toHaveProperty('masaBerlakuBulan')
    expect(JSON.stringify(await baris(jenis.id))).toBe(sebelum)
    const gabungan = await ubah(jenis.id, { nama: '', teks: '[xyz]' })
    expect(await galat(gabungan)).toMatchObject({ code: 'VALIDATION', message: 'Jenis surat belum bisa disimpan.', fields: { nama: expect.any(String), teks: expect.any(String) } })
  })

  it('kode, subjek, asal, dan id di badan dibuang, tidak pernah berubah', async () => {
    const jenis = await buat('BUA')
    const r = await ubah(jenis.id, { kode: 'ZZZ', subjek: 'kematian', asal: 'bawaan', id: 'js_lain', desaId: 'desa_lain', nama: 'Sah' })
    expect(r.status).toBe(200)
    expect(await baris(jenis.id)).toMatchObject({ id: jenis.id, kode: 'BUA', subjek: 'pemohon', asal: 'desa', desa_id: ID_SUNGAI_SIALANG, nama: 'Sah' })
  })

  it('jenis yang diarsipkan: 409 "Jenis ini diarsipkan. Aktifkan lagi sebelum mengubahnya."', async () => {
    const jenis = await buat('ARU')
    await aksi(jenis.id, 'arsipkan')
    const r = await ubah(jenis.id, { nama: 'Ubah' })
    expect(r.status).toBe(409)
    expect(await galat(r)).toMatchObject({ code: 'CONFLICT', message: PESAN_ARSIP })
    expect((await baris(jenis.id)).nama).toBe('Jenis ARU')
  })

  it('kunci baris: PATCH yang menunggu membaca ulang jenis yang diarsipkan transaksi lain, lalu 409 (bukan menimpa)', async () => {
    const jenis = await buat('KNC')
    const penahan = await tahan((s) => s`update jenis_surat set aktif = false, diarsipkan = now() where id = ${jenis.id}`)
    let selesai = false
    const permintaan = Promise.resolve(ubah(jenis.id, { nama: 'Menimpa Arsip' })).then((r) => {
      selesai = true
      return r
    })
    await tunda(600)
    expect(selesai, 'PATCH harus menunggu kunci baris').toBe(false)
    await penahan.selesaikan()
    const r = await permintaan
    expect(r.status).toBe(409)
    expect(await galat(r)).toMatchObject({ message: PESAN_ARSIP })
    expect((await baris(jenis.id)).nama).toBe('Jenis KNC')
  })

  it('id tidak ada atau milik desa lain: 404; badan salah bentuk 422 sebelum 404', async () => {
    const milikTl = dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo') as JenisSurat
    const sebelumTl = await salinKatalog('desa_tanjung_lamo')
    for (const id of ['js_tidak_ada', milikTl.id]) {
      const r = await ubah(id, { nama: 'Bukan milik' })
      expect(r.status, id).toBe(404)
      expect(await galat(r)).toMatchObject({ message: TIDAK_DITEMUKAN })
    }
    expect((await ubah('js_tidak_ada', { nama: 123 })).status).toBe(422)
    expect(await salinKatalog('desa_tanjung_lamo')).toEqual(sebelumTl)
  })

  it('hak: Kepala Desa, Kepala Dusun, dan Kaur Keuangan 403; tanpa sesi 401', async () => {
    const jenis = await buat('HKP')
    for (const peran of ['kades', 'kadus', 'kaur']) {
      const r = await ubah(jenis.id, { nama: 'Tidak boleh' }, peran)
      expect(r.status, peran).toBe(403)
      expect(await galat(r)).toMatchObject({ message: PESAN_UBAH })
    }
    expect((await kirimDenganMetode(app, 'PATCH', SS, `/api/v1/jenis-surat/${jenis.id}`, { nama: 'x' })).status).toBe(401)
    expect((await baris(jenis.id)).nama).toBe('Jenis HKP')
  })

  it('jenis bawaan boleh disunting (nama, teks, saklar aktif) seperti di tiruan', async () => {
    const sumber = katalogSs()[1]
    const asli = await baris(sumber.id)
    const r = await ubah(sumber.id, { aktif: !sumber.aktif, online: !sumber.online })
    expect(r.status).toBe(200)
    expect(await baris(sumber.id)).toMatchObject({ aktif: !sumber.aktif, online: !sumber.online, kode: sumber.kode, asal: 'bawaan' })
    await ubah(sumber.id, { aktif: asli.aktif, online: asli.online })
  })
})

describe('DELETE, arsipkan, dan aktifkan lagi (rencana 8F1 Tugas 5)', () => {
  it('hapus jenis buatan desa yang belum dipakai: terhapus, jawaban { id }', async () => {
    const jenis = await buat('HPS')
    const r = await hapus(jenis.id)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ id: jenis.id })
    expect(await baris(jenis.id)).toBeUndefined()
    expect((await hapus(jenis.id)).status).toBe(404)
  })

  it('jenis bawaan tidak bisa dihapus atau diarsipkan (422), tetap utuh', async () => {
    const sumber = bawaanSs()
    const sebelum = JSON.stringify(await baris(sumber.id))
    for (const r of [await hapus(sumber.id), await aksi(sumber.id, 'arsipkan')]) {
      expect(r.status).toBe(422)
      expect(await galat(r)).toMatchObject({ code: 'VALIDATION', message: PESAN_BAWAAN })
    }
    expect(JSON.stringify(await baris(sumber.id))).toBe(sebelum)
  })

  it('id tidak ada atau milik desa lain: 404 untuk hapus, arsipkan, dan aktifkan lagi; milik Tanjung Lamo tidak berubah', async () => {
    const milikTl = dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo') as JenisSurat
    const sebelumTl = await salinKatalog('desa_tanjung_lamo')
    for (const id of ['js_tidak_ada', milikTl.id]) {
      for (const r of [await hapus(id), await aksi(id, 'arsipkan'), await aksi(id, 'aktifkan-lagi')]) {
        expect(r.status, id).toBe(404)
        expect(await galat(r)).toMatchObject({ message: TIDAK_DITEMUKAN })
      }
    }
    expect(await salinKatalog('desa_tanjung_lamo')).toEqual(sebelumTl)
  })

  it('arsipkan: mati dan diarsipkan terisi (ISO WIB); dua kali 409; jenis arsip tidak bisa diubah', async () => {
    const jenis = await buat('ARS')
    await ubah(jenis.id, { aktif: true })
    const r = await aksi(jenis.id, 'arsipkan')
    expect(r.status).toBe(200)
    const diarsipkan = jenisSuratSchema.parse(await r.json())
    expect(diarsipkan).toMatchObject({ id: jenis.id, aktif: false })
    expect(diarsipkan.diarsipkan).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/)
    expect((await baris(jenis.id)).diarsipkan).not.toBeNull()
    const lagi = await aksi(jenis.id, 'arsipkan')
    expect(lagi.status).toBe(409)
    expect(await galat(lagi)).toMatchObject({ code: 'CONFLICT', message: 'Jenis ini sudah diarsipkan.' })
  })

  it('aktifkan lagi: diarsipkan kosong dan tetap mati; yang tidak diarsipkan 409', async () => {
    const jenis = await buat('AKT')
    const salah = await aksi(jenis.id, 'aktifkan-lagi')
    expect(salah.status).toBe(409)
    expect(await galat(salah)).toMatchObject({ message: 'Jenis ini tidak sedang diarsipkan.' })
    await aksi(jenis.id, 'arsipkan')
    const r = await aksi(jenis.id, 'aktifkan-lagi')
    expect(r.status).toBe(200)
    expect(jenisSuratSchema.parse(await r.json())).toMatchObject({ id: jenis.id, aktif: false, diarsipkan: null })
    expect(await baris(jenis.id)).toMatchObject({ aktif: false, diarsipkan: null })
  })

  it('hak: Kepala Desa, Kepala Dusun, dan Kaur Keuangan 403 pada hapus, arsipkan, dan aktifkan lagi; tidak ada yang berubah', async () => {
    const jenis = await buat('HKQ')
    for (const peran of ['kades', 'kadus', 'kaur']) {
      for (const r of [await hapus(jenis.id, peran), await aksi(jenis.id, 'arsipkan', peran), await aksi(jenis.id, 'aktifkan-lagi', peran)]) {
        expect(r.status, peran).toBe(403)
        expect(await galat(r)).toMatchObject({ message: PESAN_UBAH })
      }
    }
    expect(await baris(jenis.id)).toMatchObject({ aktif: false, diarsipkan: null })
  })

  it('seluruh perubahan desa Sungai Sialang tidak menyentuh katalog Tanjung Lamo', async () => {
    const tl = await salinKatalog('desa_tanjung_lamo')
    const jenis = await buat('ISO')
    await ubah(jenis.id, { nama: 'Isolasi' })
    await aksi(jenis.id, 'arsipkan')
    await hapus(jenis.id)
    expect(await salinKatalog('desa_tanjung_lamo')).toEqual(tl)
  })
})
