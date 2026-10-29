import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { detailPermohonanSchema, PESAN_CATATAN_NIK } from '@sinfodes/kontrak/surat/permohonan'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ruang } from '../../kripto/ruang'
import type { Penyandi } from '../../kripto/penyandi'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimDenganMetode, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_MEMBUAT = 'Peran Anda tidak berhak membuat surat.'
const PESAN_MENGUBAH = 'Peran Anda tidak berhak mengubah permohonan.'
const PESAN_DITANGGUHKAN = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'
const KUNCI_NOURUT_2026 = `permohonan-nourut:${ID_SUNGAI_SIALANG}:2026`

let uji: DbUji
let dunia: DbDemo
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
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
  for (const [i, [nama, basis, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, basis, surel, 'demo', `10.11.0.${i + 1}`)).kuki as string
  // Jenis tambahan untuk uji penolakan dan kunci: satu diarsipkan, satu dimatikan, satu aktif untuk balapan arsip/hapus.
  for (const [id, kode, aktif, arsip] of [['js_uji_arsip', 'ARS', false, '2026-09-01T03:00:00Z'], ['js_uji_mati', 'MTI', false, null], ['js_uji_kunci', 'LCK', true, null], ['js_uji_hapus', 'HPS', true, null]] as const) {
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal, diarsipkan)
      values (${id}, ${ID_SUNGAI_SIALANG}, ${kode}, ${`Jenis ${kode}`}, '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', ${aktif}, 'desa', ${arsip})`
  }
  // Satu penduduk Tanjung Lamo (desa itu kosong di dunia demo): pemohon desa lain yang harus tetap tidak terlihat dari Sungai Sialang.
  await uji.sqlMigrasi.begin(async (tx) => {
    await tx`insert into dusun (id, desa_id, nomor, nama, kepala_dusun, posyandu, rw) values ('dsn_uji_tl', 'desa_tanjung_lamo', 1, 'Dusun Uji', 'Bapak Uji', 'Posyandu Uji', ${tx.json([])})`
    await tx`insert into keluarga (id, desa_id, nomor_kk_sandi, nomor_kk_indeks, kepala_keluarga_id, dusun_id, rw, rt, tanggal_terbit)
      values ('kk_uji_tl', 'desa_tanjung_lamo', 'sandi', 'indeks-uji-tl', 'pdk_uji_tl', 'dsn_uji_tl', '001', '001', '2020-01-01')`
    await tx`insert into penduduk (id, desa_id, nik_sandi, nik_indeks, nama, jenis_kelamin, golongan_darah, agama, kewarganegaraan, tempat_lahir, tanggal_lahir,
        keluarga_id, hubungan_keluarga, nama_ayah, nama_ibu, dusun_id, rw, rt, status_dasar, status_penduduk, ktp_el, dibuat_pada, diubah_pada)
      values ('pdk_uji_tl', 'desa_tanjung_lamo', ${penyandi.sandikan('1405095203910001', ruang.nik('desa_tanjung_lamo'))}, ${penyandi.indeks('1405095203910001', ruang.nik('desa_tanjung_lamo'))},
        'Warga Tanjung Lamo', 'L', 'O', 'Islam', 'WNI', 'Uji', '1990-01-01', 'kk_uji_tl', 'Kepala Keluarga', 'Ayah', 'Ibu', 'dsn_uji_tl', '001', '001', 'Hidup', 'Tetap', 'Sudah rekam', now(), now())`
  })
})
afterAll(async () => {
  await uji?.tutup()
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const jenis = (kode: string) => dunia.jenisSurat.find((j) => j.desaId === ID_SUNGAI_SIALANG && j.kode === kode) as (typeof dunia.jenisSurat)[number]
const penduduk = (id: string) => dunia.penduduk.find((p) => p.id === id) as (typeof dunia.penduduk)[number]
const PEMOHON = 'pdk_siti_rahmah'
const buat = async (badan: unknown, peran: string | null = 'operator', ap = app, basis = SS) => kirimJson(ap, basis, '/api/v1/permohonan', badan, peran === null ? null : kuki[peran])
const ubah = async (id: string, badan: unknown, peran: string | null = 'operator') => kirimDenganMetode(app, 'PATCH', SS, `/api/v1/permohonan/${id}`, badan, peran === null ? null : kuki[peran])
const draf = (kode = 'SKD', tambahan: Record<string, unknown> = {}) => ({
  jenisId: jenis(kode).id, pemohonId: PEMOHON, subjekId: null, mutasiId: null, isian: { keperluan: 'Melamar pekerjaan' }, ajukan: false, ...tambahan,
})
const detailDari = async (r: Response) => {
  expect(r.status, JSON.stringify(await r.clone().json())).toBe(200)
  return detailPermohonanSchema.parse(await r.json())
}
const barisDb = async (id: string) => (await uji.sqlMigrasi`select * from permohonan where id = ${id}`)[0]
const isianDb = async (id: string) => {
  const b = await barisDb(id)
  return JSON.parse(penyandi.bukaSandi(b.isian_sandi as string, ruang.permohonanIsian(b.desa_id as string))) as Record<string, string>
}
const maksNoUrut = async (tahun: number) =>
  Number((await uji.sqlMigrasi`select coalesce(max(no_urut), 0)::int as n from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and tahun = ${tahun}`)[0].n)
const jumlahBaris = async (tabel: string) => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n)
const tidur = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
/** Menunggu sebentar: bila permintaan belum selesai, ia memang menunggu kunci yang ditahan uji. */
const sedangMenunggu = async (janji: Promise<unknown>) => (await Promise.race([janji.then(() => false), tidur(600).then(() => true)])) === true

describe('POST /permohonan: simpan draf dan ajukan (rencana 8F2a Tugas 6)', () => {
  it('simpan draf: Diproses, kanal loket, dusun pemohon, nomor urut berikutnya, riwayat dibuat, Buku hari ini', async () => {
    const sebelum = await maksNoUrut(2026)
    const d = await detailDari(await buat(draf('SKD', { isian: { keperluan: '  Melamar pekerjaan ', asing: 'dibuang' } })))
    const p = d.permohonan
    expect(p).toMatchObject({
      status: 'diproses', tahap: null, kanal: 'loket', desaId: ID_SUNGAI_SIALANG, dusunId: penduduk(PEMOHON).dusunId, noUrut: sebelum + 1, jenisId: jenis('SKD').id,
      pemohonId: PEMOHON, subjekId: null, mutasiId: null, dikembalikan: null, penolakan: null, pembatalan: null, diambil: null, ditutupPada: null,
      masukPada: '2026-09-24T09:00:00+07:00', lampiran: [], catatanInternal: null, terbit: null,
    })
    expect(p.isian).toEqual({ keperluan: 'Melamar pekerjaan' })
    expect(p.riwayat.map((r) => r.kejadian)).toEqual(['dibuat'])
    expect(p.riwayat[0].oleh).toEqual({ id: dunia.pengguna.find((u) => u.email === 'rosmiati@sungaisialang.desa.id')?.id, nama: 'Rosmiati' })
    expect(await isianDb(p.id)).toEqual({ keperluan: 'Melamar pekerjaan' })
    expect((await barisDb(p.id)).isian_sandi).toMatch(/^v1\./)
    const [akt] = await uji.sqlMigrasi`select jenis, ringkasan, rujukan_jenis, rujukan_id, dusun_id, oleh_nama from aktivitas where rujukan_id = ${p.id}`
    expect(akt).toMatchObject({ jenis: 'permohonan-masuk', ringkasan: `Permohonan SKD · ${penduduk(PEMOHON).nama} (loket)`, rujukan_jenis: 'permohonan', dusun_id: p.dusunId, oleh_nama: 'Rosmiati' })
    expect(akt.ringkasan).not.toMatch(/\d{9,}/)
  })

  it('ajukan: Perlu TTD; SKTM masuk tahap paraf, jenis tanpa paraf langsung tanda-tangan; riwayat dibuat lalu ajukan-ttd', async () => {
    const skd = (await detailDari(await buat(draf('SKD', { ajukan: true })))).permohonan
    expect(skd).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan' })
    expect(skd.riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'ajukan-ttd'])
    const sktm = (await detailDari(await buat(draf('SKTM', { ajukan: true, isian: { keperluan: 'Kesehatan', instansiTujuan: 'RSUD Pangkalan Kerinci' } })))).permohonan
    expect(sktm).toMatchObject({ status: 'perlu-ttd', tahap: 'paraf' })
    expect(sktm.isian).toEqual({ keperluan: 'Kesehatan', instansiTujuan: 'RSUD Pangkalan Kerinci' })
  })

  it('ajukan dengan isian kurang: 422 per field isian.<kunci>, tidak ada yang tersimpan', async () => {
    const sebelum = [await jumlahBaris('permohonan'), await jumlahBaris('riwayat_surat'), await jumlahBaris('aktivitas')]
    const r = await buat(draf('SKTM', { ajukan: true, isian: { keperluan: 'Kesehatan' } }))
    expect(r.status).toBe(422)
    expect(await galat(r)).toMatchObject({ code: 'VALIDATION', message: 'Isian surat belum lengkap.', fields: { 'isian.instansiTujuan': 'Instansi tujuan wajib diisi' } })
    expect([await jumlahBaris('permohonan'), await jumlahBaris('riwayat_surat'), await jumlahBaris('aktivitas')]).toEqual(sebelum)
    // Simpan draf tidak menuntut isian lengkap.
    expect((await buat(draf('SKTM', { isian: {} }))).status).toBe(200)
    // Isian lebih dari 500 karakter ditolak oleh skema.
    expect((await buat(draf('SKD', { isian: { keperluan: 'x'.repeat(501) } }))).status).toBe(422)
  })

  it('field galat: jenis, pemohon, subjek, dan jenis yang tidak tersedia', async () => {
    const kasus: [string, Record<string, unknown>, number, Record<string, string>][] = [
      ['jenis tidak ada', { jenisId: 'js_tidak_ada' }, 422, { jenisId: 'Jenis surat tidak ditemukan.' }],
      ['jenis arsip', { jenisId: 'js_uji_arsip' }, 409, { jenisId: 'Jenis surat ini tidak tersedia.' }],
      ['jenis dimatikan', { jenisId: 'js_uji_mati' }, 409, { jenisId: 'Jenis surat ini tidak tersedia.' }],
      ['pemohon tidak ada', { pemohonId: 'pdk_tidak_ada' }, 422, { pemohonId: 'Pemohon tidak ditemukan.' }],
      ['pemohon desa lain', { pemohonId: 'pdk_uji_tl' }, 422, { pemohonId: 'Pemohon tidak ditemukan.' }],
      ['subjek tidak ada', { subjekId: 'pdk_tidak_ada' }, 422, { subjekId: 'Penduduk yang diterangkan tidak ditemukan.' }],
    ]
    for (const [nama, ubahan, status, fields] of kasus) {
      const r = await buat(draf('SKD', ubahan))
      expect(r.status, nama).toBe(status)
      expect((await galat(r)).fields, nama).toEqual(fields)
    }
  })

  it('pemohon yang diblokir: Meninggal, Pindah, bayi tanpa subjek, kematian tanpa catatan meninggal; pengantar pindah yang baru dicatat sah', async () => {
    const meninggal = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Meninggal') as (typeof dunia.penduduk)[number]
    const pindah = dunia.mutasi.find((m) => m.desaId === ID_SUNGAI_SIALANG && m.jenis === 'pindah') as (typeof dunia.mutasi)[number]
    const orangPindah = penduduk(pindah.pendudukIds[0])
    expect(orangPindah.statusDasar).toBe('Pindah')
    const blokir = async (ubahan: Record<string, unknown>, kode = 'SKD') => {
      const r = await buat(draf(kode, ubahan))
      expect(r.status, JSON.stringify(ubahan)).toBe(422)
      return (await galat(r)).fields as Record<string, string>
    }
    expect((await blokir({ pemohonId: meninggal.id })).pemohonId).toBe(`${meninggal.nama} berstatus Meninggal. Surat tidak bisa dibuat atas nama penduduk yang sudah meninggal atau pindah.`)
    expect((await blokir({ pemohonId: orangPindah.id })).pemohonId).toContain('berstatus Pindah')
    expect((await blokir({ isian: { pelapor: 'Ayah' } }, 'SKL')).subjekId).toBe('Pilih bayi yang diterangkan surat ini.')
    expect((await blokir({ isian: {} }, 'SKM')).subjekId).toBe('Pilih penduduk yang meninggal.')
    expect((await blokir({ subjekId: PEMOHON, isian: {} }, 'SKM')).subjekId).toBe(`${penduduk(PEMOHON).nama} belum dicatat meninggal. Catat kematiannya lebih dulu di Mutasi.`)
    // Pengantar pindah untuk kepindahan yang baru dicatat tetap sah, tanpa catatan itu diblokir.
    const isianPindah = { alamatTujuan: 'Jl. Baru', alasan: 'Pekerjaan', anggotaPindah: orangPindah.nama }
    expect((await blokir({ pemohonId: orangPindah.id, isian: isianPindah }, 'SPP')).pemohonId).toContain('berstatus Pindah')
    const sah = await detailDari(await buat(draf('SPP', { pemohonId: orangPindah.id, mutasiId: pindah.id, isian: isianPindah })))
    expect(sah.permohonan.mutasiId).toBe(pindah.id)
    expect(sah.mutasi?.id).toBe(pindah.id)
    // Kematian untuk orang yang memang tercatat meninggal juga sah, dan membawa subjeknya.
    const kematian = await detailDari(await buat(draf('SKM', { subjekId: meninggal.id, isian: {} })))
    expect(kematian.subjek?.id).toBe(meninggal.id)
  })

  it('hak: hanya Operator dan Sekretaris Desa; Kepala Desa, Kepala Dusun, Kaur Keuangan 403; tanpa sesi 401; badan rusak 422', async () => {
    for (const peran of ['kades', 'kadus', 'kaur']) {
      const r = await buat(draf(), peran)
      expect(r.status, peran).toBe(403)
      expect((await galat(r)).message, peran).toBe(PESAN_MEMBUAT)
    }
    expect((await buat(draf('SKD'), 'sekdes')).status).toBe(200)
    expect((await buat(draf(), null)).status).toBe(401)
    for (const badan of [{}, null, { ...draf(), ajukan: 'ya' }, { ...draf(), jenisId: '' }]) expect((await buat(badan)).status, JSON.stringify(badan)).toBe(422)
  })

  it('desa Ditangguhkan menolak membuat permohonan; desa lain tidak terpengaruh', async () => {
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = 'desa_tanjung_lamo'`
    try {
      const { app: baru } = rakitApp({ klien: uji.klien, penyandi })
      const r = await buat({ jenisId: 'x', pemohonId: 'y', subjekId: null, mutasiId: null, isian: {}, ajukan: false }, 'operatorTl', baru, TL)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_DITANGGUHKAN)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = 'desa_tanjung_lamo'`
    }
    expect((await buat(draf('SKD'))).status).toBe(200)
  })
})

describe('nomor urut permohonan: serentak dan pergantian tahun (fokus review 2)', () => {
  it('delapan permintaan serentak mendapat nomor urut berurutan, tanpa lubang dan tanpa ganda', async () => {
    const awal = await maksNoUrut(2026)
    const hasil = await Promise.all(Array.from({ length: 8 }, () => buat(draf('SKD'))))
    const nomor = (await Promise.all(hasil.map(detailDari))).map((d) => d.permohonan.noUrut).sort((a, b) => a - b)
    expect(nomor).toEqual(Array.from({ length: 8 }, (_, i) => awal + 1 + i))
    expect(await maksNoUrut(2026)).toBe(awal + 8)
  })

  it('kunci penasihat menahan permintaan sampai transaksi lain selesai, lalu nomor urut melanjutkan (bukti deterministik)', async () => {
    const awal = await maksNoUrut(2026)
    const koneksi = await uji.sqlMigrasi.reserve()
    let lepas = false
    try {
      await koneksi`begin`
      await koneksi`select pg_advisory_xact_lock(hashtextextended(${KUNCI_NOURUT_2026}, 0))`
      // Transaksi lain sedang membuat permohonan bernomor berikutnya dan belum komit.
      await koneksi`insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
        values ('srt_uji_kunci', ${ID_SUNGAI_SIALANG}, ${penduduk(PEMOHON).dusunId}, 2026, ${awal + 1}, ${jenis('SKD').id}, 'loket', ${PEMOHON}, 'v1.x', 'menunggu', now())`
      const permintaan = buat(draf('SKD'))
      expect(await sedangMenunggu(permintaan)).toBe(true)
      await koneksi`commit`
      lepas = true
      const d = await detailDari(await permintaan)
      expect(d.permohonan.noUrut).toBe(awal + 2)
    } finally {
      if (!lepas) await koneksi`rollback`
      koneksi.release()
    }
  })

  it('pergantian tahun menurut WIB: nomor urut tahun baru mulai dari 1, tahun lama melanjutkan', async () => {
    let jam = new Date('2026-12-31T16:59:00Z') // 23.59 WIB
    const { app: appJam } = rakitApp({ klien: uji.klien, penyandi, waktu: () => jam })
    const k = (await masukLewatRute(appJam, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.11.9.1')).kuki as string
    const dasar = maksNoUrut(2026)
    const lama = await detailDari(await kirimJson(appJam, SS, '/api/v1/permohonan', draf('SKD'), k))
    expect(lama.permohonan.noUrut).toBe((await dasar) + 1)
    jam = new Date('2026-12-31T17:01:00Z') // 00.01 WIB, 1 Januari 2027
    const baru1 = await detailDari(await kirimJson(appJam, SS, '/api/v1/permohonan', draf('SKD'), k))
    const baru2 = await detailDari(await kirimJson(appJam, SS, '/api/v1/permohonan', draf('SKD'), k))
    expect([baru1.permohonan.noUrut, baru2.permohonan.noUrut]).toEqual([1, 2])
    const tahun = (await uji.sqlMigrasi`select id, tahun from permohonan where id in (${lama.permohonan.id}, ${baru1.permohonan.id})`).map((b) => [b.id, b.tahun])
    expect(Object.fromEntries(tahun)).toEqual({ [lama.permohonan.id]: 2026, [baru1.permohonan.id]: 2027 })
  })
})

describe('jenis yang diarsipkan atau dihapus tepat saat permohonan dibuat (fokus review 3)', () => {
  it('arsip yang sedang berjalan (belum komit) menahan permintaan, lalu ditolak 409 dan tidak ada permohonan baru', async () => {
    const sebelum = await jumlahBaris('permohonan')
    const koneksi = await uji.sqlMigrasi.reserve()
    let lepas = false
    try {
      await koneksi`begin`
      await koneksi`update jenis_surat set aktif = false, diarsipkan = now() where id = 'js_uji_kunci'`
      const permintaan = buat({ ...draf('SKD'), jenisId: 'js_uji_kunci', isian: {} })
      expect(await sedangMenunggu(permintaan)).toBe(true)
      await koneksi`commit`
      lepas = true
      const r = await permintaan
      expect(r.status).toBe(409)
      expect((await galat(r)).fields).toEqual({ jenisId: 'Jenis surat ini tidak tersedia.' })
    } finally {
      if (!lepas) await koneksi`rollback`
      koneksi.release()
    }
    expect(await jumlahBaris('permohonan')).toBe(sebelum)
  })

  it('penghapusan jenis yang sedang berjalan (belum komit) menahan permintaan, lalu 422 jenis tidak ditemukan; tidak ada permohonan yatim', async () => {
    const sebelum = await jumlahBaris('permohonan')
    const koneksi = await uji.sqlMigrasi.reserve()
    let lepas = false
    try {
      await koneksi`begin`
      await koneksi`delete from jenis_surat where id = 'js_uji_hapus'`
      const permintaan = buat({ ...draf('SKD'), jenisId: 'js_uji_hapus', isian: {} })
      expect(await sedangMenunggu(permintaan)).toBe(true)
      await koneksi`commit`
      lepas = true
      const r = await permintaan
      expect(r.status).toBe(422)
      expect((await galat(r)).fields).toEqual({ jenisId: 'Jenis surat tidak ditemukan.' })
    } finally {
      if (!lepas) await koneksi`rollback`
      koneksi.release()
    }
    expect(await jumlahBaris('permohonan')).toBe(sebelum)
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from permohonan p where not exists (select 1 from jenis_surat j where j.id = p.jenis_id)`)[0].n)).toBe(0)
  })
})

describe('PATCH /permohonan/:id (rencana 8F2a Tugas 6)', () => {
  const buatDiproses = async (isian: Record<string, string> = { keperluan: 'Melamar pekerjaan' }) =>
    (await detailDari(await buat(draf('SKD', { isian })))).permohonan
  const menunggu = () => dunia.permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.status === 'menunggu') as (typeof dunia.permohonan)[number]

  it('isian disimpan saat Diproses: kunci asing dibuang, riwayat disimpan hanya bila isian benar-benar berubah', async () => {
    const p = await buatDiproses()
    const d = await detailDari(await ubah(p.id, { isian: { keperluan: ' Beasiswa ', asing: 'x' } }))
    expect(d.permohonan.isian).toEqual({ keperluan: 'Beasiswa' })
    expect(await isianDb(p.id)).toEqual({ keperluan: 'Beasiswa' })
    expect(d.permohonan.riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'disimpan'])
    const sama = await detailDari(await ubah(p.id, { isian: { keperluan: 'Beasiswa' } }))
    expect(sama.permohonan.riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'disimpan'])
    expect((await barisDb(p.id)).isian_sandi).toMatch(/^v1\./)
  })

  it('isian hanya saat Diproses: Menunggu dan Perlu TTD 409; catatan internal boleh kapan saja', async () => {
    const m = menunggu()
    const r = await ubah(m.id, { isian: { keperluan: 'x' } })
    expect(r.status).toBe(409)
    expect((await galat(r)).message).toBe('Isian hanya bisa diubah saat permohonan berstatus Diproses.')
    const diajukan = (await detailDari(await buat(draf('SKD', { ajukan: true })))).permohonan
    expect((await ubah(diajukan.id, { isian: { keperluan: 'x' } })).status).toBe(409)
    for (const id of [m.id, diajukan.id]) {
      expect((await detailDari(await ubah(id, { catatanInternal: ' Sudah dicek ' }))).permohonan.catatanInternal).toBe('Sudah dicek')
    }
    const selesai = dunia.permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.status === 'selesai') as (typeof dunia.permohonan)[number]
    expect((await detailDari(await ubah(selesai.id, { catatanInternal: 'Arsip fisik di lemari 2' }))).permohonan.catatanInternal).toBe('Arsip fisik di lemari 2')
    expect((await detailDari(await ubah(selesai.id, { catatanInternal: '' }))).permohonan.catatanInternal).toBeNull()
    expect((await barisDb(selesai.id)).catatan_internal).toBeNull()
  })

  it('catatan internal dengan 16 angka berurutan 422 dengan pesan kontrak; isian lebih dari 500 karakter 422', async () => {
    const p = await buatDiproses()
    const r = await ubah(p.id, { catatanInternal: 'NIK 1405095203918002' })
    expect(r.status).toBe(422)
    expect((await galat(r)).fields).toEqual({ catatanInternal: PESAN_CATATAN_NIK })
    expect((await ubah(p.id, { isian: { keperluan: 'x'.repeat(501) } })).status).toBe(422)
    expect((await barisDb(p.id)).catatan_internal).toBeNull()
  })

  it('hak: hanya Operator dan Sekretaris Desa; id tidak ada 404; badan rusak 422; tanpa sesi 401', async () => {
    const p = await buatDiproses()
    for (const peran of ['kades', 'kadus', 'kaur']) {
      const r = await ubah(p.id, { catatanInternal: 'x' }, peran)
      expect(r.status, peran).toBe(403)
      expect((await galat(r)).message, peran).toBe(PESAN_MENGUBAH)
    }
    expect((await ubah(p.id, { catatanInternal: 'oleh sekdes' }, 'sekdes')).status).toBe(200)
    const tidakAda = await ubah('srt_tidak_ada', { catatanInternal: 'x' })
    expect(tidakAda.status).toBe(404)
    expect((await galat(tidakAda)).message).toBe('Permohonan tidak ditemukan.')
    expect((await ubah(p.id, { isian: 'bukan peta' })).status).toBe(422)
    expect((await ubah(p.id, { catatanInternal: 'x' }, null)).status).toBe(401)
  })

  it('kunci baris: perubahan status yang belum komit menahan PATCH isian, lalu status dibaca ulang dan permintaan ditolak 409', async () => {
    const p = await buatDiproses()
    const koneksi = await uji.sqlMigrasi.reserve()
    let lepas = false
    try {
      await koneksi`begin`
      await koneksi`update permohonan set status = 'ditolak', ditutup_pada = now(), penolakan = '{"oleh":{"id":"x","nama":"y"},"pada":"2026-09-24T09:00:00+07:00","catatan":"uji"}'::jsonb where id = ${p.id}`
      const permintaan = ubah(p.id, { isian: { keperluan: 'Seharusnya tidak tersimpan' } })
      expect(await sedangMenunggu(permintaan)).toBe(true)
      await koneksi`commit`
      lepas = true
      const r = await permintaan
      expect(r.status).toBe(409)
      expect(await isianDb(p.id)).toEqual({ keperluan: 'Melamar pekerjaan' })
    } finally {
      if (!lepas) await koneksi`rollback`
      koneksi.release()
    }
  })

  it('PATCH murni di luar yang diminta: tidak membuat permohonan, riwayat, atau aktivitas baru', async () => {
    const p = await buatDiproses()
    const sebelum = [await jumlahBaris('permohonan'), await jumlahBaris('aktivitas')]
    await ubah(p.id, { catatanInternal: 'catatan baru' })
    expect([await jumlahBaris('permohonan'), await jumlahBaris('aktivitas')]).toEqual(sebelum)
  })

  it('GET tidak menulis: membaca detail permohonan baru tidak mengubah jumlah baris', async () => {
    const p = await buatDiproses()
    const sebelum = [await jumlahBaris('permohonan'), await jumlahBaris('riwayat_surat')]
    expect((await ambil(app, `${SS}/api/v1/permohonan/${p.id}`, kuki.operator)).status).toBe(200)
    expect([await jumlahBaris('permohonan'), await jumlahBaris('riwayat_surat')]).toEqual(sebelum)
  })
})
