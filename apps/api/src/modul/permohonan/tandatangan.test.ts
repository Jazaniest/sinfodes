import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { galatSchema } from '@sinfodes/kontrak/api'
import { berlakuSampai } from '@sinfodes/kontrak/surat/waktu'
import { FORMAT_NOMOR_BAWAAN } from '@sinfodes/kontrak/surat/nomor-surat'
import { PESAN_PASSPHRASE_BELUM_ADA, PESAN_PASSPHRASE_SALAH } from '@sinfodes/kontrak/surat/passphrase'
import { detailPermohonanSchema, type DetailPermohonan } from '@sinfodes/kontrak/surat/permohonan'
import { POLA_KODE_VERIFIKASI } from '@sinfodes/kontrak/surat/verifikasi'
import { TATA_LETAK_SIAP, samaDenganSiap, tataLetakBerlaku } from '@sinfodes/kontrak/surat/tata-letak-siap'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { kirimDenganMetode, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import { PESAN_TERLALU_SERING } from '../../lapisan/batas-laju'
import type { Penyandi } from '../../kripto/penyandi'
import { hashDokumen } from './dokumen'
import type { EfekSurat } from './efek-surat'
import { buatPenandatanganSimulator } from './penandatangan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const PESAN_BERUBAH = 'Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.'
const PESAN_KADES = 'Surat ini harus ditandatangani Kepala Desa.'
const BENAR = 'sialang2026'
const PEMOHON = 'pdk_siti_rahmah'

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<string, string> = {}
const efek = { panggilan: [] as unknown[][], gagal: false }
const efekUji: EfekSurat = {
  async suratDikembalikan() {},
  async suratDitandatangani(...args) {
    efek.panggilan.push(args)
    if (efek.gagal) throw new Error('efek gagal')
  },
}

/** Jenis uji: kode -> pengaturan. TTA hanya Kepala Desa dan berlaku 3 bulan; yang lain boleh atas nama. */
const JENIS = {
  TTA: { atasNama: false, masa: 3 },
  TTB: { atasNama: true, masa: null },
  TTC: { atasNama: true, masa: null },
  TTF: { atasNama: false, masa: null },
  TTG: { atasNama: true, masa: null },
  TTH: { atasNama: true, masa: null },
} as const
type KodeJenis = keyof typeof JENIS
const idJenis = (kode: string) => `js_uji_${kode.toLowerCase()}`

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi, efekSurat: efekUji }).app
  const akun: [string, string][] = [['operator', 'rosmiati'], ['sekdes', 'hendri'], ['kades', 'kades'], ['kaur', 'nurhayati'], ['kadus', 'sukardi']]
  for (const [i, [nama, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, SS, `${surel}@sungaisialang.desa.id`, 'demo', `10.14.0.${i + 1}`)).kuki as string
  for (const [kode, j] of Object.entries(JENIS)) {
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, masa_berlaku_bulan, online, syarat, teks, aktif, asal)
      values (${idJenis(kode)}, ${ID_SUNGAI_SIALANG}, ${kode}, ${`Jenis ${kode}`}, '470', 'pemohon', '[]'::jsonb, ${j.atasNama}, false, ${j.masa}, true, '[]'::jsonb, 'Yang bertanda tangan menerangkan [nama] berkeperluan.', true, 'desa')`
  }
  // Format dan urutan dipastikan lewat rute, supaya perhitungan nomor di bawah pasti.
  const atur = await kirimDenganMetode(app, 'PUT', SS, '/api/v1/pengaturan/penomoran', { formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS' }, kuki.sekdes)
  expect(atur.status, JSON.stringify(await atur.clone().json())).toBe(200)
  for (const peran of ['kades', 'sekdes']) {
    const r = await kirimDenganMetode(app, 'PUT', SS, '/api/v1/sesi/passphrase-tanda-tangan', { kataSandi: 'demo', passphrase: BENAR }, kuki[peran])
    expect(r.status).toBe(200)
  }
}, 60_000)
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  efek.panggilan.length = 0
  efek.gagal = false
  await uji.sqlMigrasi`delete from kunci_masuk_desa where jenis = 'passphrase'`
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const aksi = async (nama: string, id: string, badan: unknown = {}, peran: string | null = 'operator'): Promise<Response> =>
  kirimJson(app, SS, `/api/v1/permohonan/${id}/${nama}`, badan, peran === null ? null : kuki[peran])
const tandatangani = (id: string, passphrase: unknown = BENAR, peran = 'kades'): Promise<Response> => aksi('tandatangani', id, { passphrase }, peran)
const detailDari = async (r: Response): Promise<DetailPermohonan> => {
  expect(r.status, JSON.stringify(await r.clone().json())).toBe(200)
  return detailPermohonanSchema.parse(await r.json())
}
/** Permohonan baru dari loket langsung di tahap tanda tangan. */
const siapTtd = async (kode: KodeJenis = 'TTA') => {
  const d = await detailDari(
    await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: idJenis(kode), pemohonId: PEMOHON, subjekId: null, mutasiId: null, isian: {}, ajukan: true }, kuki.operator),
  )
  expect(d.permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan' })
  return d.permohonan.id
}
const lihat = async (id: string, peran = 'kades') => detailDari(await app.fetch(new Request(`${SS}/api/v1/permohonan/${id}`, { headers: { Cookie: kuki[peran] } })))
const barisDb = async (id: string) => (await uji.sqlMigrasi`select * from permohonan where id = ${id}`)[0]
const riwayatDb = async (id: string) => (await uji.sqlMigrasi`select kejadian, catatan, oleh from riwayat_surat where permohonan_id = ${id} order by urutan`).map((b) => ({ ...b }))
const auditDb = async (jenis: string) => (await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit where jenis = ${jenis} order by waktu, id`).map((b) => ({ ...b }))
const urutTertinggi = async () =>
  Number((await uji.sqlMigrasi`select coalesce(max(terbit_urut), 0) as n from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and terbit_tahun = 2026`)[0].n)
const tidur = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const sedangMenunggu = async (janji: Promise<unknown>) => (await Promise.race([janji.then(() => false), tidur(600).then(() => true)])) === true
const pad3 = (n: number) => String(n).padStart(3, '0')

describe('tandatangani: jalur normal (rencana 8F2b Tugas 6)', () => {
  it('Kepala Desa menandatangani: surat terbit dengan nomor, kode, masa berlaku, lembar, tata letak, dan kop beku', async () => {
    const id = await siapTtd('TTA')
    const sebelum = await urutTertinggi()
    const d = await detailDari(await tandatangani(id))
    const t = d.permohonan.terbit
    expect(d.permohonan).toMatchObject({ status: 'selesai', tahap: null, ditutupPada: '2026-09-24T09:00:00+07:00' })
    expect(t).not.toBeNull()
    expect(t).toMatchObject({
      tahun: 2026, urut: sebelum + 1, nomor: `470/${pad3(sebelum + 1)}/SS/IX/2026`, pada: '2026-09-24T09:00:00+07:00', mode: 'tte',
      berlakuSampai: berlakuSampai('2026-09-24', 3), penandatangan: { id: 'pgn_nasir', peran: 'kades' },
    })
    expect(t?.kodeVerifikasi).toMatch(POLA_KODE_VERIFIKASI)
    expect(t?.kodeVerifikasi.startsWith('SS-')).toBe(true)
    expect(berlakuSampai('2026-09-24', 3)).toBe('2026-12-24')
    expect(t?.lembar.judul.length).toBeGreaterThan(0)
    expect(JSON.stringify(t?.lembar)).toContain('Siti Rahmah')
    expect(t?.lembar.tempatTanggal).toContain('24 September 2026')
    // Tata letak dan kop dibekukan: tata letak berlaku saat itu dengan `siap` dihitung server, kop dari desa saat itu.
    const berlaku = tataLetakBerlaku(d.jenis, d.pengaturan)
    expect(t?.tataLetak).toEqual({ ...berlaku, siap: samaDenganSiap(berlaku) })
    expect(t?.kop).toEqual({ lambang: null, lambangKabupaten: null })
    // GET detail mengembalikan surat terbit yang sama.
    expect((await lihat(id)).permohonan.terbit).toEqual(t)
  })

  it('hash dokumen dan tanda tangan tersimpan dan cocok dengan surat yang tersimpan; kolom bersandi berawalan v1.', async () => {
    const id = await siapTtd('TTA')
    const t = (await detailDari(await tandatangani(id))).permohonan.terbit
    if (!t) throw new Error('Surat belum terbit')
    const b = await barisDb(id)
    expect(b.hash_dokumen).toBe(hashDokumen(t))
    expect(b.tanda_tangan).toMatch(/^sim1\./)
    expect(await buatPenandatanganSimulator(penyandi).periksa({ desaId: ID_SUNGAI_SIALANG, hashDokumen: b.hash_dokumen as string, tandaTangan: b.tanda_tangan as string })).toBe(true)
    expect(b.isian_sandi).toMatch(/^v1\./)
    expect(b.terbit_lembar_sandi).toMatch(/^v1\./)
    // Tidak ada 16 angka berurutan (NIK) polos di kolom mana pun.
    expect(JSON.stringify(b)).not.toMatch(/(^|[^0-9])[0-9]{16}([^0-9]|$)/)
  })

  it('riwayat tandatangani bercatatan nomor, aktivitas surat-terbit, jejak audit surat.terbit, dan efek dipanggil sekali', async () => {
    const id = await siapTtd('TTA')
    const nomor = (await detailDari(await tandatangani(id))).permohonan.terbit?.nomor as string
    const riwayat = await riwayatDb(id)
    expect(riwayat.at(-1)).toMatchObject({ kejadian: 'tandatangani', catatan: nomor, oleh: { id: 'pgn_nasir' } })
    const aktivitas = await uji.sqlMigrasi`select jenis, ringkasan, oleh_id from aktivitas where rujukan_id = ${id} and jenis = 'surat-terbit'`
    expect(aktivitas).toHaveLength(1)
    expect(aktivitas[0].ringkasan).toContain(nomor)
    expect(aktivitas[0].oleh_id).toBe('pgn_nasir')
    expect((await auditDb('surat.terbit')).filter((a) => (a.ringkasan as Record<string, unknown>).permohonanId === id)).toEqual([
      { pelaku: 'pgn_nasir', ringkasan: { permohonanId: id, nomor, mode: 'tte' } },
    ])
    expect(efek.panggilan).toHaveLength(1)
    expect(efek.panggilan[0][4]).toBe(nomor)
  })

  it('daftar dan jumlah: surat masuk tab Selesai dengan nomornya', async () => {
    const sebelum = (await (await app.fetch(new Request(`${SS}/api/v1/permohonan/jumlah?periode=365&jenis=TTA`, { headers: { Cookie: kuki.kades } }))).json()) as { status: Record<string, number> }
    const id = await siapTtd('TTA')
    const nomor = (await detailDari(await tandatangani(id))).permohonan.terbit?.nomor
    const sesudah = (await (await app.fetch(new Request(`${SS}/api/v1/permohonan/jumlah?periode=365&jenis=TTA`, { headers: { Cookie: kuki.kades } }))).json()) as { status: Record<string, number> }
    expect(sesudah.status.selesai).toBe(sebelum.status.selesai + 1)
    const daftar = (await (await app.fetch(new Request(`${SS}/api/v1/permohonan?status=selesai&pageSize=50&periode=30&jenis=TTA`, { headers: { Cookie: kuki.kades } }))).json()) as { data: { id: string; nomor: string }[] }
    expect(daftar.data.find((b) => b.id === id)?.nomor).toBe(nomor)
  })

  it('Sekretaris Desa menandatangani hanya jenis yang boleh atas nama, dengan penanda tangan berperan sekdes', async () => {
    const tolak = await tandatangani(await siapTtd('TTA'), BENAR, 'sekdes')
    expect(tolak.status).toBe(403)
    expect((await galat(tolak)).message).toBe(PESAN_KADES)
    const d = await detailDari(await tandatangani(await siapTtd('TTB'), BENAR, 'sekdes'))
    expect(d.permohonan.terbit?.penandatangan).toMatchObject({ id: 'pgn_hendri', peran: 'sekdes' })
  })
})

describe('tandatangani: gagal (rencana 8F2b Tugas 6)', () => {
  it('belum tahap tanda tangan: 409', async () => {
    const d = await detailDari(await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: idJenis('TTA'), pemohonId: PEMOHON, subjekId: null, mutasiId: null, isian: {}, ajukan: false }, kuki.operator))
    const r = await tandatangani(d.permohonan.id)
    expect(r.status).toBe(409)
    expect((await galat(r)).message).toBe(PESAN_BERUBAH)
  })

  it('Operator dan Kaur Keuangan 403; permohonan tidak ada atau di luar dusun 404', async () => {
    const id = await siapTtd('TTA')
    // Operator membuka Layanan Surat tetapi tidak menandatangani; Kaur Keuangan bahkan tidak punya hak membuka (gerbang pertama).
    const operator = await tandatangani(id, BENAR, 'operator')
    expect(operator.status).toBe(403)
    expect((await galat(operator)).message).toBe(PESAN_KADES)
    const kaur = await tandatangani(id, BENAR, 'kaur')
    expect(kaur.status).toBe(403)
    expect((await galat(kaur)).message).toBe('Peran Anda tidak berhak membuka Layanan Surat.')
    expect((await tandatangani('srt_tidak_ada')).status).toBe(404)
    const luar = await tandatangani(id, BENAR, 'kadus')
    expect([403, 404]).toContain(luar.status)
    expect((await barisDb(id)).status).toBe('perlu-ttd')
  })

  it('passphrase kosong atau tidak dikirim: 422 pada field passphrase', async () => {
    const id = await siapTtd('TTA')
    const kosong = await tandatangani(id, '')
    expect(kosong.status).toBe(422)
    expect((await galat(kosong)).fields).toHaveProperty('passphrase')
    const hilang = await aksi('tandatangani', id, {}, 'kades')
    expect(hilang.status).toBe(422)
  })

  it('passphrase belum ditetapkan: 422 tanpa mengubah apa pun dan tanpa dihitung', async () => {
    await uji.sqlMigrasi`delete from passphrase_tanda_tangan where pengguna_id = 'pgn_nasir'`
    try {
      const id = await siapTtd('TTA')
      const r = await tandatangani(id)
      expect(r.status).toBe(422)
      expect(await galat(r)).toMatchObject({ message: PESAN_PASSPHRASE_BELUM_ADA, fields: { passphrase: PESAN_PASSPHRASE_BELUM_ADA } })
      expect((await uji.sqlMigrasi`select count(*)::int as n from kunci_masuk_desa where jenis = 'passphrase'`)[0].n).toBe(0)
    } finally {
      await kirimDenganMetode(app, 'PUT', SS, '/api/v1/sesi/passphrase-tanda-tangan', { kataSandi: 'demo', passphrase: BENAR }, kuki.kades)
    }
  })

  it('passphrase salah: 422, permohonan tidak berubah, nomor tidak terpakai; hitungan dan jejak audit tersimpan', async () => {
    const id = await siapTtd('TTA')
    const awal = await barisDb(id)
    const riwayatAwal = await riwayatDb(id)
    const sebelum = await urutTertinggi()
    const r = await tandatangani(id, 'salah-banget')
    expect(r.status).toBe(422)
    expect(await galat(r)).toMatchObject({ message: PESAN_PASSPHRASE_SALAH, fields: { passphrase: PESAN_PASSPHRASE_SALAH } })
    expect(await barisDb(id)).toEqual(awal)
    expect(await riwayatDb(id)).toEqual(riwayatAwal)
    expect(await urutTertinggi()).toBe(sebelum)
    expect((await uji.sqlMigrasi`select gagal from kunci_masuk_desa where jenis = 'passphrase'`).map((b) => b.gagal)).toEqual([1])
    expect((await auditDb('passphrase.gagal')).filter((a) => (a.ringkasan as Record<string, unknown>).permohonanId === id)).toEqual([
      { pelaku: 'pgn_nasir', ringkasan: { alasan: 'passphrase-salah', permohonanId: id } },
    ])
    // Tebakan salah tidak memakai nomor: tanda tangan benar berikutnya mendapat nomor berikutnya yang sama.
    const d = await detailDari(await tandatangani(id))
    expect(d.permohonan.terbit?.urut).toBe(sebelum + 1)
  })

  it('lima passphrase salah mengunci: yang kelima 429, passphrase benar pun 429 tanpa mengubah permohonan', async () => {
    const id = await siapTtd('TTA')
    const hasil: number[] = []
    for (let i = 1; i <= 5; i++) hasil.push((await tandatangani(id, `salah-${i}-${i}`)).status)
    expect(hasil).toEqual([422, 422, 422, 422, 429])
    const terkunci = await tandatangani(id, BENAR)
    expect(terkunci.status).toBe(429)
    expect((await galat(terkunci)).message).toBe(PESAN_TERLALU_SERING)
    expect((await barisDb(id)).status).toBe('perlu-ttd')
    // Sekretaris Desa tidak ikut terkunci.
    expect((await tandatangani(await siapTtd('TTB'), BENAR, 'sekdes')).status).toBe(200)
  })

  it('isian wajib yang baru ditambahkan pada jenis dan masih kosong menahan tanda tangan (422)', async () => {
    const id = await siapTtd('TTF')
    const isian = [{ kunci: 'keperluan', label: 'Keperluan', jenis: 'teks', wajib: true, pilihan: null, rupiah: false, diTabel: false, keterangan: null }]
    await uji.sqlMigrasi`update jenis_surat set isian = ${uji.sqlMigrasi.json(isian)} where id = ${idJenis('TTF')}`
    try {
      const r = await tandatangani(id)
      expect(r.status).toBe(422)
      const pesan = (await galat(r)).message
      expect(pesan.startsWith('Isian surat belum lengkap (')).toBe(true)
      expect(pesan.endsWith('Kembalikan ke operator untuk dilengkapi.')).toBe(true)
      expect((await barisDb(id)).status).toBe('perlu-ttd')
    } finally {
      await uji.sqlMigrasi`update jenis_surat set isian = '[]'::jsonb where id = ${idJenis('TTF')}`
    }
  })

  it('desa Ditangguhkan menolak tanda tangan', async () => {
    const id = await siapTtd('TTA')
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${ID_SUNGAI_SIALANG}`
    try {
      const baru = rakitApp({ klien: uji.klien, penyandi, efekSurat: efekUji }).app
      const r = await kirimJson(baru, SS, `/api/v1/permohonan/${id}/tandatangani`, { passphrase: BENAR }, kuki.kades)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe('Langganan desa ditangguhkan. Panel hanya bisa dilihat.')
      expect((await barisDb(id)).status).toBe('perlu-ttd')
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${ID_SUNGAI_SIALANG}`
    }
  })

  it('efek yang gagal membatalkan seluruh tanda tangan: nomor tidak terpakai dan permohonan tak berubah', async () => {
    const id = await siapTtd('TTA')
    const sebelum = await urutTertinggi()
    const awal = await barisDb(id)
    efek.gagal = true
    const r = await tandatangani(id)
    expect(r.status).toBe(500)
    expect(await barisDb(id)).toEqual(awal)
    expect(await urutTertinggi()).toBe(sebelum)
    efek.gagal = false
    expect((await detailDari(await tandatangani(id))).permohonan.terbit?.urut).toBe(sebelum + 1)
  })
})

describe('surat terbit beku (rencana 8F2b Tugas 6, Ruling 10-11)', () => {
  it('mengganti tata letak jenis, tata letak desa, lambang, kode surat desa, dan data pemohon tidak mengubah surat terbit', async () => {
    const id = await siapTtd('TTA')
    const asli = (await detailDari(await tandatangani(id))).permohonan.terbit
    const lembarAsli = JSON.stringify(asli?.lembar)
    const desaAsli = (await uji.sqlMigrasi`select kode_surat, lambang, lambang_kabupaten from desa where id = ${ID_SUNGAI_SIALANG}`)[0]
    const pengaturanAsli = (await uji.sqlMigrasi`select tata_letak from pengaturan_surat where desa_id = ${ID_SUNGAI_SIALANG}`)[0]
    const namaAsli = (await uji.sqlMigrasi`select nama from penduduk where id = ${PEMOHON}`)[0].nama as string
    try {
      await uji.sqlMigrasi`update jenis_surat set tata_letak = ${uji.sqlMigrasi.json(TATA_LETAK_SIAP['rata-tengah'])} where id = ${idJenis('TTA')}`
      if (pengaturanAsli) await uji.sqlMigrasi`update pengaturan_surat set tata_letak = ${uji.sqlMigrasi.json(TATA_LETAK_SIAP['dua-lambang'])} where desa_id = ${ID_SUNGAI_SIALANG}`
      await uji.sqlMigrasi`update desa set kode_surat = 'ZZ', lambang = 'data:image/png;base64,AAAA', lambang_kabupaten = 'data:image/png;base64,BBBB' where id = ${ID_SUNGAI_SIALANG}`
      await uji.sqlMigrasi`update penduduk set nama = 'Nama Sudah Berubah' where id = ${PEMOHON}`
      const baru = rakitApp({ klien: uji.klien, penyandi, efekSurat: efekUji }).app
      const lagi = detailPermohonanSchema.parse(await (await baru.fetch(new Request(`${SS}/api/v1/permohonan/${id}`, { headers: { Cookie: kuki.kades } }))).json())
      expect(lagi.permohonan.terbit).toEqual(asli)
      expect(JSON.stringify(lagi.permohonan.terbit?.lembar)).toBe(lembarAsli)
      expect(JSON.stringify(lagi.permohonan.terbit?.lembar)).toContain('Siti Rahmah')
    } finally {
      await uji.sqlMigrasi`update jenis_surat set tata_letak = null where id = ${idJenis('TTA')}`
      if (pengaturanAsli) await uji.sqlMigrasi`update pengaturan_surat set tata_letak = ${uji.sqlMigrasi.json(pengaturanAsli.tata_letak)} where desa_id = ${ID_SUNGAI_SIALANG}`
      await uji.sqlMigrasi`update desa set kode_surat = ${desaAsli.kode_surat}, lambang = ${desaAsli.lambang}, lambang_kabupaten = ${desaAsli.lambang_kabupaten} where id = ${ID_SUNGAI_SIALANG}`
      await uji.sqlMigrasi`update penduduk set nama = ${namaAsli} where id = ${PEMOHON}`
    }
  })

  it('kop dan kode desa yang dibekukan adalah yang berlaku saat tanda tangan, bukan cache alamat', async () => {
    const desaAsli = (await uji.sqlMigrasi`select kode_surat, lambang, lambang_kabupaten from desa where id = ${ID_SUNGAI_SIALANG}`)[0]
    const id = await siapTtd('TTA')
    // App yang sama (cache alamat sudah terisi) tetap harus membaca desa terbaru dari basis data saat menandatangani.
    await uji.sqlMigrasi`update desa set kode_surat = 'KB', lambang = 'data:image/png;base64,CCCC' where id = ${ID_SUNGAI_SIALANG}`
    try {
      const t = (await detailDari(await tandatangani(id))).permohonan.terbit
      expect(t?.nomor).toMatch(/\/KB\/IX\/2026$/)
      expect(t?.kodeVerifikasi.startsWith('KB-')).toBe(true)
      expect(t?.kop.lambang).toBe('data:image/png;base64,CCCC')
    } finally {
      await uji.sqlMigrasi`update desa set kode_surat = ${desaAsli.kode_surat}, lambang = ${desaAsli.lambang}, lambang_kabupaten = ${desaAsli.lambang_kabupaten} where id = ${ID_SUNGAI_SIALANG}`
    }
  })

  it('PATCH isian sesudah terbit 409; UPDATE langsung ke kolom beku ditolak pemicu', async () => {
    const id = await siapTtd('TTA')
    await detailDari(await tandatangani(id))
    const patch = await kirimDenganMetode(app, 'PATCH', SS, `/api/v1/permohonan/${id}`, { isian: { keperluan: 'Lain' } }, kuki.operator)
    expect(patch.status).toBe(409)
    const g = await uji.sqlMigrasi`update permohonan set terbit_nomor = 'X' where id = ${id}`.then(() => null, (e: unknown) => e)
    expect(g).toMatchObject({ code: '23514' })
  })
})

describe('tandatangani serentak (rencana 8F2b Tugas 6, fokus tinjauan 1-2)', () => {
  it('dua tanda tangan pada permohonan yang sama: satu 200, satu 409, satu nomor, satu riwayat, satu audit', async () => {
    const id = await siapTtd('TTA')
    const [a, b] = await Promise.all([tandatangani(id), tandatangani(id)])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const kalah = a.status === 409 ? a : b
    expect((await galat(kalah)).message).toBe(PESAN_BERUBAH)
    expect((await riwayatDb(id)).filter((r) => r.kejadian === 'tandatangani')).toHaveLength(1)
    expect((await auditDb('surat.terbit')).filter((x) => (x.ringkasan as Record<string, unknown>).permohonanId === id)).toHaveLength(1)
    expect(efek.panggilan).toHaveLength(1)
  })

  it('kunci baris: transaksi yang mengubah keadaan (belum commit) menahan tanda tangan, yang lalu membaca ulang dan mendapat 409', async () => {
    const id = await siapTtd('TTA')
    const sebelum = await urutTertinggi()
    const penahan = await uji.sqlMigrasi.reserve()
    try {
      await penahan`begin`
      await penahan`select id from permohonan where id = ${id} for update`
      await penahan`update permohonan set status = 'diproses', tahap = null where id = ${id}`
      const janji = tandatangani(id)
      expect(await sedangMenunggu(janji), 'tanda tangan harus menunggu kunci baris').toBe(true)
      await penahan`commit`
      const r = await janji
      expect(r.status).toBe(409)
      expect((await galat(r)).message).toBe(PESAN_BERUBAH)
    } finally {
      await penahan`rollback`.catch(() => undefined)
      penahan.release()
    }
    expect((await barisDb(id)).terbit_nomor).toBeNull()
    expect(await urutTertinggi()).toBe(sebelum)
  })

  const serentak = async (kodeJenis: readonly KodeJenis[]) => {
    const ids: { id: string; kode: KodeJenis }[] = []
    for (let i = 0; i < 8; i++) {
      const kode = kodeJenis[i % kodeJenis.length]
      ids.push({ id: await siapTtd(kode), kode })
    }
    // Setengah Kepala Desa, setengah Sekretaris Desa: dua kunci pengguna berbeda, satu kunci nomor yang diperebutkan.
    const hasil = await Promise.all(ids.map(async ({ id, kode }, i) => ({ kode, r: await tandatangani(id, BENAR, i % 2 === 0 ? 'kades' : 'sekdes') })))
    const terbit: { kode: KodeJenis; urut: number; kodeVerifikasi: string }[] = []
    for (const { kode, r } of hasil) {
      const d = await detailDari(r)
      terbit.push({ kode, urut: d.permohonan.terbit?.urut as number, kodeVerifikasi: d.permohonan.terbit?.kodeVerifikasi as string })
    }
    expect(new Set(terbit.map((t) => t.kodeVerifikasi)).size).toBe(8)
    return terbit
  }
  const urutan = (t: { urut: number }[]) => t.map((x) => x.urut).sort((x, y) => x - y)

  it('delapan permohonan serentak, satu jenis, mode per-tahun: nomor berurutan tanpa lubang dan tanpa ganda', async () => {
    const sebelum = await urutTertinggi()
    const t = await serentak(['TTB'])
    expect(urutan(t)).toEqual(Array.from({ length: 8 }, (_, i) => sebelum + 1 + i))
  })

  it('delapan permohonan serentak, jenis campuran, mode per-tahun: nomor berurutan lintas jenis', async () => {
    const sebelum = await urutTertinggi()
    const t = await serentak(['TTB', 'TTC'])
    expect(urutan(t)).toEqual(Array.from({ length: 8 }, (_, i) => sebelum + 1 + i))
  })

  it('delapan permohonan serentak, jenis campuran, mode per-jenis: tiap jenis berurutan sendiri', async () => {
    const ubah = (urutanMode: 'per-tahun' | 'per-jenis') =>
      kirimDenganMetode(app, 'PUT', SS, '/api/v1/pengaturan/penomoran', { formatNomor: FORMAT_NOMOR_BAWAAN.replace('{urut}', '{kodeJenis}/{urut}'), urutan: urutanMode, kodeSurat: 'SS' }, kuki.sekdes)
    expect((await ubah('per-jenis')).status).toBe(200)
    try {
      const t = await serentak(['TTG', 'TTH'])
      expect(urutan(t.filter((x) => x.kode === 'TTG'))).toEqual([1, 2, 3, 4])
      expect(urutan(t.filter((x) => x.kode === 'TTH'))).toEqual([1, 2, 3, 4])
    } finally {
      await kirimDenganMetode(app, 'PUT', SS, '/api/v1/pengaturan/penomoran', { formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS' }, kuki.sekdes)
    }
  })

  it('campuran tanda tangan, kembalikan, dan tanda tangan ganda pada banyak permohonan selesai tanpa kebuntuan', async () => {
    const ids: string[] = []
    for (let i = 0; i < 9; i++) ids.push(await siapTtd('TTB'))
    const tugas: Promise<Response>[] = []
    for (const [i, id] of ids.entries()) {
      if (i < 4) tugas.push(tandatangani(id, BENAR, i % 2 === 0 ? 'kades' : 'sekdes'))
      else if (i < 8) tugas.push(aksi('kembalikan', id, { catatan: 'Lengkapi berkas.' }, i % 2 === 0 ? 'kades' : 'sekdes'))
      else tugas.push(tandatangani(id, BENAR, 'kades'), tandatangani(id, BENAR, 'sekdes'))
    }
    const hasil = await Promise.all(tugas)
    const status = hasil.map((r) => r.status).sort()
    expect(status.filter((s) => s >= 500)).toEqual([])
    expect(status.filter((s) => s === 200)).toHaveLength(9)
    expect(status.filter((s) => s === 409)).toHaveLength(1)
  }, 60_000)
})
