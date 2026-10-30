import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { detailPermohonanSchema, PESAN_CATATAN_NIK, type Permohonan } from '@sinfodes/kontrak/surat/permohonan'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ruang } from '../../kripto/ruang'
import type { Penyandi } from '../../kripto/penyandi'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import type { EfekSurat } from './efek-surat'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const PESAN_BERUBAH = 'Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.'
const PESAN_DITANGGUHKAN = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'
const TIDAK_BERHAK = {
  proses: 'Peran Anda tidak berhak memproses permohonan.',
  tolak: 'Peran Anda tidak berhak menolak permohonan.',
  'ajukan-ttd': 'Peran Anda tidak berhak mengajukan tanda tangan.',
  paraf: 'Hanya Sekretaris Desa yang memaraf surat.',
  kembalikan: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa mengembalikan surat.',
} as const

let uji: DbUji
let dunia: DbDemo
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<string, string> = {}
const efek = { panggilan: [] as unknown[][], gagal: false }
const efekUji: EfekSurat = {
  async suratDikembalikan(...args) {
    efek.panggilan.push(args)
    if (efek.gagal) throw new Error('efek gagal')
  },
  async suratDitandatangani() {
    // Dipakai uji tanda tangan (tandatangan.test.ts).
  },
}
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi, efekSurat: efekUji }).app
  const akun: [string, string, string][] = [
    ['operator', SS, 'rosmiati@sungaisialang.desa.id'], ['sekdes', SS, 'hendri@sungaisialang.desa.id'], ['kades', SS, 'kades@sungaisialang.desa.id'],
    ['kaur', SS, 'nurhayati@sungaisialang.desa.id'], ['kadus', SS, 'sukardi@sungaisialang.desa.id'], ['operatorTl', TL, 'operator@tanjunglamo.desa.id'],
  ]
  for (const [i, [nama, basis, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, basis, surel, 'demo', `10.12.0.${i + 1}`)).kuki as string
  // Jenis tambahan: satu aktif tanpa isian untuk uji arsip saat permohonan berjalan, satu untuk uji hapus serentak.
  for (const [id, kode] of [['js_uji_arc', 'ARC'], ['js_uji_hps', 'HPS'], ['js_uji_pks', 'PKS']] as const) {
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
      values (${id}, ${ID_SUNGAI_SIALANG}, ${kode}, ${`Jenis ${kode}`}, '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`
  }
  // Tanjung Lamo kosong di dunia demo; satu permohonan menunggu di sana cukup untuk uji desa Ditangguhkan.
  await uji.sqlMigrasi.begin(async (tx) => {
    await tx`insert into dusun (id, desa_id, nomor, nama, kepala_dusun, posyandu, rw) values ('dsn_uji_tl', 'desa_tanjung_lamo', 1, 'Dusun Uji', 'Bapak Uji', 'Posyandu Uji', ${tx.json([])})`
    await tx`insert into keluarga (id, desa_id, nomor_kk_sandi, nomor_kk_indeks, kepala_keluarga_id, dusun_id, rw, rt, tanggal_terbit)
      values ('kk_uji_tl', 'desa_tanjung_lamo', 'sandi', 'indeks-uji-tl', 'pdk_uji_tl', 'dsn_uji_tl', '001', '001', '2020-01-01')`
    await tx`insert into penduduk (id, desa_id, nik_sandi, nik_indeks, nama, jenis_kelamin, golongan_darah, agama, kewarganegaraan, tempat_lahir, tanggal_lahir,
        keluarga_id, hubungan_keluarga, nama_ayah, nama_ibu, dusun_id, rw, rt, status_dasar, status_penduduk, ktp_el, dibuat_pada, diubah_pada)
      values ('pdk_uji_tl', 'desa_tanjung_lamo', ${penyandi.sandikan('1405095203910001', ruang.nik('desa_tanjung_lamo'))}, ${penyandi.indeks('1405095203910001', ruang.nik('desa_tanjung_lamo'))},
        'Warga Tanjung Lamo', 'L', 'O', 'Islam', 'WNI', 'Uji', '1990-01-01', 'kk_uji_tl', 'Kepala Keluarga', 'Ayah', 'Ibu', 'dsn_uji_tl', '001', '001', 'Hidup', 'Tetap', 'Sudah rekam', now(), now())`
    await tx`insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
      values ('srt_uji_tl', 'desa_tanjung_lamo', 'dsn_uji_tl', 2026, 1, ${(dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo') as (typeof dunia.jenisSurat)[number]).id}, 'loket', 'pdk_uji_tl',
        ${penyandi.sandikan('{}', ruang.permohonanIsian('desa_tanjung_lamo'))}, 'menunggu', now())`
  })
})
afterAll(async () => {
  await uji?.tutup()
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const jenis = (kode: string) => dunia.jenisSurat.find((j) => j.desaId === ID_SUNGAI_SIALANG && j.kode === kode) as (typeof dunia.jenisSurat)[number]
const aksi = async (nama: string, id: string, badan: unknown = {}, peran: string | null = 'operator', ap = app, basis = SS) =>
  kirimJson(ap, basis, `/api/v1/permohonan/${id}/${nama}`, badan, peran === null ? null : kuki[peran])
const detailDari = async (r: Response) => {
  expect(r.status, JSON.stringify(await r.clone().json())).toBe(200)
  return detailPermohonanSchema.parse(await r.json())
}
const buat = async (kode: string, ajukan: boolean, isian: Record<string, string>) =>
  (await detailDari(await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: jenis(kode).id, pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian, ajukan }, kuki.operator))).permohonan
const draf = () => buat('SKD', false, { keperluan: 'Melamar pekerjaan' })
const perluTtd = (kode = 'SKD') => buat(kode, true, kode === 'SKTM' ? { keperluan: 'Kesehatan', instansiTujuan: 'RSUD' } : { keperluan: 'Melamar pekerjaan' })
const menunggu = (n: number) => dunia.permohonan.filter((p) => p.desaId === ID_SUNGAI_SIALANG && p.status === 'menunggu')[n]
const barisDb = async (id: string) => (await uji.sqlMigrasi`select * from permohonan where id = ${id}`)[0]
const riwayatDb = async (id: string) => (await uji.sqlMigrasi`select kejadian, catatan, oleh from riwayat_surat where permohonan_id = ${id} order by urutan`).map((b) => b)
const tidur = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const sedangMenunggu = async (janji: Promise<unknown>) => (await Promise.race([janji.then(() => false), tidur(600).then(() => true)])) === true
const dari = (peran: string) => dunia.pengguna.find((u) => u.email === { operator: 'rosmiati', sekdes: 'hendri', kades: 'kades' }[peran] + '@sungaisialang.desa.id') as (typeof dunia.pengguna)[number]

describe('aksi status: proses (rencana 8F2a Tugas 7)', () => {
  it('Menunggu menjadi Diproses, riwayat proses oleh pelaku; proses lagi 409', async () => {
    const p = menunggu(0)
    const d = await detailDari(await aksi('proses', p.id))
    expect(d.permohonan).toMatchObject({ status: 'diproses', tahap: null })
    expect(d.permohonan.riwayat.at(-1)).toMatchObject({ kejadian: 'proses', waktu: '2026-09-24T09:00:00+07:00', oleh: { id: dari('operator').id, nama: 'Rosmiati' } })
    const lagi = await aksi('proses', p.id)
    expect(lagi.status).toBe(409)
    expect((await galat(lagi)).message).toBe(PESAN_BERUBAH)
    expect((await riwayatDb(p.id)).filter((r) => r.kejadian === 'proses')).toHaveLength(1)
  })
})

describe('aksi status: tolak', () => {
  it('dari Menunggu atau Diproses: Ditolak, ditutup, penolakan, riwayat berisi alasan, Buku hari ini tanpa NIK', async () => {
    const p = menunggu(1)
    const d = await detailDari(await aksi('tolak', p.id, { alasan: ' Foto KTP buram ' }))
    expect(d.permohonan).toMatchObject({ status: 'ditolak', tahap: null, ditutupPada: '2026-09-24T09:00:00+07:00' })
    expect(d.permohonan.penolakan).toEqual({ oleh: { id: dari('operator').id, nama: 'Rosmiati' }, pada: '2026-09-24T09:00:00+07:00', catatan: 'Foto KTP buram' })
    expect(d.permohonan.riwayat.at(-1)).toMatchObject({ kejadian: 'tolak', catatan: 'Foto KTP buram' })
    const pemohon = dunia.penduduk.find((x) => x.id === p.pemohonId)
    const kode = dunia.jenisSurat.find((j) => j.id === p.jenisId)?.kode
    const [akt] = await uji.sqlMigrasi`select jenis, ringkasan, dusun_id from aktivitas where rujukan_id = ${p.id}`
    expect(akt).toMatchObject({ jenis: 'surat-ditolak', ringkasan: `Permohonan ditolak · ${kode} · ${pemohon?.nama}`, dusun_id: p.dusunId })
    expect(akt.ringkasan).not.toMatch(/\d{9,}/)
    const dariDiproses = await draf()
    expect((await detailDari(await aksi('tolak', dariDiproses.id, { alasan: 'Tidak sesuai' }))).permohonan.status).toBe('ditolak')
    const lagi = await aksi('tolak', p.id, { alasan: 'sekali lagi' })
    expect(lagi.status).toBe(409)
    expect((await galat(lagi)).message).toBe(PESAN_BERUBAH)
  })

  it('alasan wajib, paling banyak 500 karakter, dan tanpa 16 angka; kegagalan tidak mengubah apa pun', async () => {
    const p = await draf()
    const kasus: [unknown, string | null][] = [[{}, null], [{ alasan: '   ' }, 'Alasan wajib diisi'], [{ alasan: 'x'.repeat(501) }, 'Paling banyak 500 karakter'], [{ alasan: 'NIK 1405095203918002' }, PESAN_CATATAN_NIK]]
    for (const [badan, pesan] of kasus) {
      const r = await aksi('tolak', p.id, badan)
      expect(r.status, JSON.stringify(badan)).toBe(422)
      const fields = (await galat(r)).fields
      // Alasan yang hilang sama sekali memakai pesan bawaan Zod (sama dengan API tiruan); selebihnya pesan kontrak.
      if (pesan === null) expect(Object.keys(fields ?? {})).toEqual(['alasan'])
      else expect(fields).toEqual({ alasan: pesan })
    }
    expect((await barisDb(p.id)).status).toBe('diproses')
    expect((await riwayatDb(p.id)).map((r) => r.kejadian)).toEqual(['dibuat'])
  })
})

describe('aksi status: ajukan-ttd', () => {
  it('isian diganti, dikembalikan dihapus, tahap awal menurut wajib paraf', async () => {
    const sktm = await buat('SKTM', false, { keperluan: 'Kesehatan' })
    const d = await detailDari(await aksi('ajukan-ttd', sktm.id, { isian: { keperluan: 'Pendidikan', instansiTujuan: ' SMA 1 ', asing: 'dibuang' } }))
    expect(d.permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'paraf', dikembalikan: null })
    expect(d.permohonan.isian).toEqual({ keperluan: 'Pendidikan', instansiTujuan: 'SMA 1' })
    expect((await barisDb(sktm.id)).isian_sandi).toMatch(/^v1\./)
    expect(d.permohonan.riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'ajukan-ttd'])
    const skd = await draf()
    expect((await detailDari(await aksi('ajukan-ttd', skd.id))).permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan' })
  })

  it('isian kurang: 422 per field isian.<kunci> dengan "Isian surat belum lengkap."; kunci asing dibuang; status tidak berubah', async () => {
    const sktm = await buat('SKTM', false, { keperluan: 'Kesehatan' })
    const r = await aksi('ajukan-ttd', sktm.id, { isian: { keperluan: 'Kesehatan' } })
    expect(r.status).toBe(422)
    expect(await galat(r)).toMatchObject({ message: 'Isian surat belum lengkap.', fields: { 'isian.instansiTujuan': 'Instansi tujuan wajib diisi' } })
    expect((await aksi('ajukan-ttd', sktm.id)).status).toBe(422)
    expect((await barisDb(sktm.id)).status).toBe('diproses')
    expect((await aksi('ajukan-ttd', sktm.id, { isian: { keperluan: 'x'.repeat(501), instansiTujuan: 'a' } })).status).toBe(422)
  })

  it('hanya dari Diproses: Menunggu dan Perlu TTD 409', async () => {
    for (const id of [menunggu(2).id, (await perluTtd()).id]) {
      const r = await aksi('ajukan-ttd', id)
      expect(r.status, id).toBe(409)
      expect((await galat(r)).message).toBe(PESAN_BERUBAH)
    }
  })
})

describe('aksi status: paraf dan kembalikan', () => {
  it('paraf: hanya Sekretaris Desa; tahap menjadi tanda-tangan; dua kali 409', async () => {
    const p = await perluTtd('SKTM')
    for (const peran of ['operator', 'kades']) {
      const r = await aksi('paraf', p.id, {}, peran)
      expect(r.status, peran).toBe(403)
      expect((await galat(r)).message).toBe(TIDAK_BERHAK.paraf)
    }
    const d = await detailDari(await aksi('paraf', p.id, {}, 'sekdes'))
    expect(d.permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan' })
    expect(d.permohonan.riwayat.at(-1)).toMatchObject({ kejadian: 'paraf', oleh: { id: dari('sekdes').id } })
    const lagi = await aksi('paraf', p.id, {}, 'sekdes')
    expect(lagi.status).toBe(409)
  })

  it('kembalikan: Sekretaris dan Kepala Desa; catatan wajib; Diproses, tahap kosong, dikembalikan terisi; efek terpanggil sekali; diajukan ulang menghapus tandanya', async () => {
    const p = await perluTtd()
    efek.panggilan.length = 0
    for (const badan of [{}, { catatan: '  ' }, { catatan: 'x'.repeat(501) }, { catatan: 'NIK 1405095203918002' }]) {
      expect((await aksi('kembalikan', p.id, badan, 'kades')).status, JSON.stringify(badan)).toBe(422)
    }
    expect(efek.panggilan).toHaveLength(0)
    const operator = await aksi('kembalikan', p.id, { catatan: 'Perbaiki' }, 'operator')
    expect(operator.status).toBe(403)
    expect((await galat(operator)).message).toBe(TIDAK_BERHAK.kembalikan)
    const d = await detailDari(await aksi('kembalikan', p.id, { catatan: ' Perbaiki nama ' }, 'kades'))
    expect(d.permohonan).toMatchObject({ status: 'diproses', tahap: null })
    expect(d.permohonan.dikembalikan).toEqual({ oleh: { id: dari('kades').id, nama: dari('kades').nama }, pada: '2026-09-24T09:00:00+07:00', catatan: 'Perbaiki nama' })
    expect(d.permohonan.riwayat.at(-1)).toMatchObject({ kejadian: 'kembalikan', catatan: 'Perbaiki nama' })
    expect(efek.panggilan).toHaveLength(1)
    const [argDb, argP, argJenis, argPemohon, argCatatan, argOleh] = efek.panggilan[0]
    expect(argDb).toBeTruthy()
    expect(argP).toMatchObject({ id: p.id, desaId: ID_SUNGAI_SIALANG })
    expect(argJenis).toMatchObject({ kode: 'SKD' })
    expect(argPemohon).toMatchObject({ id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' })
    expect(argCatatan).toBe('Perbaiki nama')
    expect(argOleh).toEqual({ id: dari('kades').id, nama: dari('kades').nama })
    const ulang = await detailDari(await aksi('ajukan-ttd', p.id))
    expect(ulang.permohonan).toMatchObject({ status: 'perlu-ttd', dikembalikan: null })
    expect(efek.panggilan).toHaveLength(1)
    expect((await aksi('kembalikan', (await draf()).id, { catatan: 'x' }, 'sekdes')).status).toBe(409)
  })

  it('galat dari efek membatalkan seluruh aksi (satu transaksi)', async () => {
    const p = await perluTtd()
    efek.gagal = true
    try {
      const r = await aksi('kembalikan', p.id, { catatan: 'Perbaiki' }, 'sekdes')
      expect(r.status).toBe(500)
    } finally {
      efek.gagal = false
    }
    const b = await barisDb(p.id)
    expect({ status: b.status, tahap: b.tahap, dikembalikan: b.dikembalikan }).toEqual({ status: 'perlu-ttd', tahap: 'tanda-tangan', dikembalikan: null })
    expect((await riwayatDb(p.id)).map((r) => r.kejadian)).toEqual(['dibuat', 'ajukan-ttd'])
  })
})

describe('hak, urutan pemeriksaan, dan aksi yang belum tersedia', () => {
  it('hak per aksi: pesan TIDAK_BERHAK; Kaur Keuangan 403 membuka Layanan Surat; tanpa sesi 401', async () => {
    const p = await draf()
    for (const [nama, pesan] of Object.entries(TIDAK_BERHAK)) {
      for (const peran of nama === 'paraf' || nama === 'kembalikan' ? ['operator'] : ['kades']) {
        const r = await aksi(nama, p.id, { alasan: 'x', catatan: 'x' }, peran)
        expect(r.status, `${nama} ${peran}`).toBe(403)
        expect((await galat(r)).message, `${nama} ${peran}`).toBe(pesan)
      }
    }
    const kaur = await aksi('proses', p.id, {}, 'kaur')
    expect(kaur.status).toBe(403)
    expect((await galat(kaur)).message).toBe(PESAN_LIHAT)
    expect((await aksi('proses', p.id, {}, null)).status).toBe(401)
    expect((await barisDb(p.id)).status).toBe('diproses')
  })

  it('urutan: aksi tidak dikenal 404, permohonan tidak ada 404, hak 403, lalu status 409, lalu isi 422', async () => {
    const m = menunggu(3)
    const tidakDikenal = await aksi('hapus', m.id)
    expect(tidakDikenal.status).toBe(404)
    expect((await galat(tidakDikenal)).message).toBe('Aksi tidak dikenal.')
    const tidakAda = await aksi('proses', 'srt_tidak_ada')
    expect(tidakAda.status).toBe(404)
    expect((await galat(tidakAda)).message).toBe('Permohonan tidak ditemukan.')
    expect((await aksi('proses', 'srt_uji_tl')).status).toBe(404)
    // Hak mendahului status: Operator memaraf permohonan Menunggu → 403, bukan 409.
    expect((await aksi('paraf', m.id)).status).toBe(403)
    // Status mendahului isi: tolak tanpa alasan pada permohonan yang sudah ditolak → 409, bukan 422.
    const ditolak = await draf()
    await aksi('tolak', ditolak.id, { alasan: 'x' })
    expect((await aksi('tolak', ditolak.id, {})).status).toBe(409)
  })

  it('Kepala Dusun hanya permohonan dusunnya: di luar dusun 404; di dalam dusun tetap 403 (tidak berhak memproses)', async () => {
    const dusun = dunia.pengguna.find((u) => u.email === 'sukardi@sungaisialang.desa.id')?.dusunId
    const dalam = dunia.permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.dusunId === dusun && p.status === 'selesai') as Permohonan
    const luar = dunia.permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.dusunId !== dusun && p.status === 'selesai') as Permohonan
    expect((await aksi('proses', luar.id, {}, 'kadus')).status).toBe(404)
    const r = await aksi('proses', dalam.id, {}, 'kadus')
    expect(r.status).toBe(403)
    expect((await galat(r)).message).toBe(TIDAK_BERHAK.proses)
  })

  it('desa Ditangguhkan menolak semua aksi, termasuk yang dibuka dengan surat.lihat; membaca tetap boleh', async () => {
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = 'desa_tanjung_lamo'`
    try {
      const { app: baru } = rakitApp({ klien: uji.klien, penyandi, efekSurat: efekUji })
      for (const nama of ['proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan', 'tandatangani', 'batalkan']) {
        const r = await aksi(nama, 'srt_uji_tl', { alasan: 'x', catatan: 'x' }, 'operatorTl', baru, TL)
        expect(r.status, nama).toBe(403)
        expect((await galat(r)).message, nama).toBe(PESAN_DITANGGUHKAN)
      }
      expect((await ambil(baru, `${TL}/api/v1/permohonan/srt_uji_tl`, kuki.operatorTl)).status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = 'desa_tanjung_lamo'`
    }
    expect((await barisDb('srt_uji_tl')).status).toBe('menunggu')
  })

  it('jenis yang diarsipkan atau dimatikan tidak menghalangi permohonan yang sudah berjalan', async () => {
    const buatArc = async () =>
      (await detailDari(await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: 'js_uji_arc', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: {}, ajukan: false }, kuki.operator))).permohonan
    const a = await buatArc()
    const b = await buatArc()
    await uji.sqlMigrasi`update jenis_surat set aktif = false, diarsipkan = now() where id = 'js_uji_arc'`
    expect((await detailDari(await aksi('ajukan-ttd', a.id))).permohonan.status).toBe('perlu-ttd')
    expect((await detailDari(await aksi('tolak', b.id, { alasan: 'Tidak diteruskan' }))).permohonan.status).toBe('ditolak')
    const baru = await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: 'js_uji_arc', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: {}, ajukan: false }, kuki.operator)
    expect(baru.status).toBe(409)
  })
})

describe('aksi serentak pada permohonan yang sama (fokus review 1)', () => {
  it('dua klik proses serentak: satu menang, yang lain 409; riwayat hanya satu', async () => {
    const p = menunggu(4)
    const hasil = await Promise.all([aksi('proses', p.id), aksi('proses', p.id)])
    expect(hasil.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await riwayatDb(p.id)).filter((r) => r.kejadian === 'proses')).toHaveLength(1)
  })

  it('perubahan status yang belum komit menahan aksi, lalu keadaan dibaca ulang dan aksi ditolak 409 (bukti deterministik)', async () => {
    const p = menunggu(5)
    const koneksi = await uji.sqlMigrasi.reserve()
    let lepas = false
    try {
      await koneksi`begin`
      await koneksi`update permohonan set status = 'ditolak', ditutup_pada = now(), penolakan = '{"oleh":{"id":"x","nama":"y"},"pada":"2026-09-24T09:00:00+07:00","catatan":"uji"}'::jsonb where id = ${p.id}`
      const permintaan = aksi('proses', p.id)
      expect(await sedangMenunggu(permintaan)).toBe(true)
      await koneksi`commit`
      lepas = true
      const r = await permintaan
      expect(r.status).toBe(409)
      expect((await galat(r)).message).toBe(PESAN_BERUBAH)
    } finally {
      if (!lepas) await koneksi`rollback`
      koneksi.release()
    }
    expect((await barisDb(p.id)).status).toBe('ditolak')
    expect((await riwayatDb(p.id)).filter((r) => r.kejadian === 'proses')).toHaveLength(0)
  })

  it('dua orang mengembalikan surat yang sama serentak: satu menang, yang lain 409, notifikasi hanya satu', async () => {
    const p = await perluTtd('SKTM')
    efek.panggilan.length = 0
    const hasil = await Promise.all([aksi('kembalikan', p.id, { catatan: 'Dari Sekdes' }, 'sekdes'), aksi('kembalikan', p.id, { catatan: 'Dari Kades' }, 'kades')])
    expect(hasil.map((r) => r.status).sort()).toEqual([200, 409])
    expect(efek.panggilan).toHaveLength(1)
    expect((await riwayatDb(p.id)).filter((r) => r.kejadian === 'kembalikan')).toHaveLength(1)
  })
})

describe('hapus jenis yang sudah dipakai (rencana 8F2a Tugas 7)', () => {
  const hapusLangsung = async (id: string) =>
    app.fetch(new Request(`${SS}/api/v1/jenis-surat/${id}`, { method: 'DELETE', headers: { Origin: SS, Cookie: kuki.operator } }))

  it('jenis desa yang sudah dipakai: 409 "Jenis ini sudah pernah dipakai. Arsipkan saja."', async () => {
    const dipakai = await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: 'js_uji_pks', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: {}, ajukan: false }, kuki.operator)
    expect(dipakai.status).toBe(200)
    const r = await hapusLangsung('js_uji_pks')
    expect(r.status).toBe(409)
    expect((await galat(r)).message).toBe('Jenis ini sudah pernah dipakai. Arsipkan saja.')
  })

  it('sisip permohonan yang belum komit menahan penghapusan, lalu 409 dan tidak ada permohonan yatim', async () => {
    const koneksi = await uji.sqlMigrasi.reserve()
    let lepas = false
    try {
      await koneksi`begin`
      await koneksi`insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
        values ('srt_uji_hps', ${ID_SUNGAI_SIALANG}, 'dsn_ss_1', 2026, 8999, 'js_uji_hps', 'loket', 'pdk_siti_rahmah', 'v1.x', 'menunggu', now())`
      const permintaan = hapusLangsung('js_uji_hps')
      expect(await sedangMenunggu(permintaan)).toBe(true)
      await koneksi`commit`
      lepas = true
      const r = await permintaan
      expect(r.status).toBe(409)
      expect((await galat(r)).message).toBe('Jenis ini sudah pernah dipakai. Arsipkan saja.')
    } finally {
      if (!lepas) await koneksi`rollback`
      koneksi.release()
    }
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from jenis_surat where id = 'js_uji_hps'`)[0].n)).toBe(1)
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from permohonan p where not exists (select 1 from jenis_surat j where j.id = p.jenis_id)`)[0].n)).toBe(0)
  })
})
