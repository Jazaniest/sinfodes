import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { galatSchema } from '@sinfodes/kontrak/api'
import { samarkanTelepon } from '@sinfodes/kontrak/format/telepon'
import { FORMAT_NOMOR_BAWAAN } from '@sinfodes/kontrak/surat/nomor-surat'
import { detailPermohonanSchema, PESAN_CATATAN_NIK, type DetailPermohonan } from '@sinfodes/kontrak/surat/permohonan'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { kirimDenganMetode, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { Pengirim } from './pengirim'

const SS = 'http://sungaisialang.sinfodes.localhost'
const PESAN_BERUBAH = 'Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.'
const PESAN_BATAL = 'Hanya Sekretaris Desa dan Kepala Desa yang bisa membatalkan surat.'
const PESAN_TANPA_WA = 'Pemohon belum punya nomor WhatsApp. Tambahkan nomornya di profil penduduk.'
const BENAR = 'sialang2026'
const PEMOHON = 'pdk_siti_rahmah'
const TELEPON = '081234567834'
const KODE_JENIS = 'TTS'

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<string, string> = {}
const terkirim: { desaId: string; ke: string; pesan: string }[] = []
const pengirimUji: Pengirim = {
  async kirimWa(m) {
    terkirim.push(m)
  },
}

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi, pengirim: pengirimUji }).app
  const akun: [string, string][] = [['operator', 'rosmiati'], ['sekdes', 'hendri'], ['kades', 'kades'], ['kaur', 'nurhayati']]
  for (const [i, [nama, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, SS, `${surel}@sungaisialang.desa.id`, 'demo', `10.15.0.${i + 1}`)).kuki as string
  await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
    values ('js_uji_tts', ${ID_SUNGAI_SIALANG}, ${KODE_JENIS}, 'Jenis Serah Terima', '470', 'pemohon', '[]'::jsonb, true, false, true, '[]'::jsonb, 'Yang bertanda tangan menerangkan [nama].', true, 'desa')`
  const atur = await kirimDenganMetode(app, 'PUT', SS, '/api/v1/pengaturan/penomoran', { formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS' }, kuki.sekdes)
  expect(atur.status).toBe(200)
  for (const peran of ['kades', 'sekdes']) {
    expect((await kirimDenganMetode(app, 'PUT', SS, '/api/v1/sesi/passphrase-tanda-tangan', { kataSandi: 'demo', passphrase: BENAR }, kuki[peran])).status).toBe(200)
  }
}, 60_000)
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  terkirim.length = 0
  await uji.sqlMigrasi`delete from kunci_masuk_desa where jenis = 'passphrase'`
  await aturTelepon(TELEPON)
})

const aturTelepon = async (nomor: string | null) => {
  const sandi = nomor === null ? null : penyandi.sandikan(nomor, ruang.telepon(ID_SUNGAI_SIALANG))
  await uji.sqlMigrasi`update penduduk set telepon_sandi = ${sandi} where id = ${PEMOHON}`
}
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const aksi = async (nama: string, id: string, badan: unknown = {}, peran: string | null = 'operator'): Promise<Response> =>
  kirimJson(app, SS, `/api/v1/permohonan/${id}/${nama}`, badan, peran === null ? null : kuki[peran])
const detailDari = async (r: Response): Promise<DetailPermohonan> => {
  expect(r.status, JSON.stringify(await r.clone().json())).toBe(200)
  return detailPermohonanSchema.parse(await r.json())
}
/** Surat yang sudah terbit (ditandatangani Kepala Desa), siap dibatalkan, diambil, atau dikirim. */
const terbitkan = async () => {
  const baru = await detailDari(
    await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: 'js_uji_tts', pemohonId: PEMOHON, subjekId: null, mutasiId: null, isian: {}, ajukan: true }, kuki.operator),
  )
  return detailDari(await aksi('tandatangani', baru.permohonan.id, { passphrase: BENAR }, 'kades'))
}
const barisDb = async (id: string) => (await uji.sqlMigrasi`select * from permohonan where id = ${id}`)[0]
const riwayatDb = async (id: string) => (await uji.sqlMigrasi`select kejadian, catatan, oleh from riwayat_surat where permohonan_id = ${id} order by urutan`).map((b) => ({ ...b }))
const auditDb = async (jenis: string, id: string) =>
  (await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit where jenis = ${jenis} order by waktu, id`).map((b) => ({ ...b })).filter((a) => (a.ringkasan as Record<string, unknown>).permohonanId === id)

describe('batalkan (rencana 8F2b Tugas 7)', () => {
  it('alasan wajib, tanpa 16 angka; hanya surat Selesai; Operator 403', async () => {
    const d = await terbitkan()
    const id = d.permohonan.id
    const kosong = await aksi('batalkan', id, {}, 'kades')
    expect(kosong.status).toBe(422)
    expect((await galat(kosong)).fields).toHaveProperty('alasan')
    const nik = await aksi('batalkan', id, { alasan: 'NIK 1405095203918002 salah' }, 'kades')
    expect(nik.status).toBe(422)
    expect((await galat(nik)).fields).toEqual({ alasan: PESAN_CATATAN_NIK })
    const operator = await aksi('batalkan', id, { alasan: 'Salah nama' }, 'operator')
    expect(operator.status).toBe(403)
    expect((await galat(operator)).message).toBe(PESAN_BATAL)
    expect((await barisDb(id)).status).toBe('selesai')
    // Surat yang belum terbit tidak bisa dibatalkan.
    const baru = await detailDari(
      await kirimJson(app, SS, '/api/v1/permohonan', { jenisId: 'js_uji_tts', pemohonId: PEMOHON, subjekId: null, mutasiId: null, isian: {}, ajukan: true }, kuki.operator),
    )
    const belum = await aksi('batalkan', baru.permohonan.id, { alasan: 'Salah nama' }, 'kades')
    expect(belum.status).toBe(409)
    expect((await galat(belum)).message).toBe(PESAN_BERUBAH)
  })

  it('Kepala Desa membatalkan: status Dibatalkan dengan pembatalan, surat terbit asli utuh, riwayat, aktivitas, dan jejak audit', async () => {
    const asli = await terbitkan()
    const id = asli.permohonan.id
    const d = await detailDari(await aksi('batalkan', id, { alasan: '  Salah nama pemohon ' }, 'kades'))
    expect(d.permohonan).toMatchObject({
      status: 'dibatalkan',
      pembatalan: { oleh: { id: 'pgn_nasir' }, pada: '2026-09-24T09:00:00+07:00', catatan: 'Salah nama pemohon' },
      ditutupPada: asli.permohonan.ditutupPada,
    })
    expect(d.permohonan.terbit).toEqual(asli.permohonan.terbit)
    expect((await riwayatDb(id)).at(-1)).toMatchObject({ kejadian: 'batalkan', catatan: 'Salah nama pemohon' })
    const nomor = asli.permohonan.terbit?.nomor as string
    const aktivitas = await uji.sqlMigrasi`select ringkasan, oleh_id from aktivitas where rujukan_id = ${id} and jenis = 'surat-dibatalkan'`
    expect(aktivitas).toHaveLength(1)
    expect(aktivitas[0].ringkasan).toBe(`Surat dibatalkan · ${KODE_JENIS} ${nomor}`)
    expect(await auditDb('surat.batal', id)).toEqual([{ pelaku: 'pgn_nasir', ringkasan: { permohonanId: id, nomor } }])
  })

  it('Sekretaris Desa boleh membatalkan', async () => {
    const d = await terbitkan()
    expect((await detailDari(await aksi('batalkan', d.permohonan.id, { alasan: 'Salah ketik' }, 'sekdes'))).permohonan.status).toBe('dibatalkan')
  })

  it('nomor surat dibatalkan tidak dipakai ulang: tanda tangan berikutnya mendapat nomor yang lebih besar', async () => {
    const a = await terbitkan()
    await detailDari(await aksi('batalkan', a.permohonan.id, { alasan: 'Salah nama' }, 'kades'))
    const b = await terbitkan()
    expect(b.permohonan.terbit?.urut).toBe((a.permohonan.terbit?.urut as number) + 1)
  })

  it('dua pembatalan serentak: satu 200, satu 409, satu riwayat batalkan', async () => {
    const d = await terbitkan()
    const id = d.permohonan.id
    const [x, y] = await Promise.all([aksi('batalkan', id, { alasan: 'Salah nama' }, 'kades'), aksi('batalkan', id, { alasan: 'Salah nama' }, 'sekdes')])
    expect([x.status, y.status].sort()).toEqual([200, 409])
    expect((await riwayatDb(id)).filter((r) => r.kejadian === 'batalkan')).toHaveLength(1)
    expect(await auditDb('surat.batal', id)).toHaveLength(1)
  })
})

describe('tandai diambil (rencana 8F2b Tugas 7)', () => {
  it('Operator menandai sekali; kedua kali 409', async () => {
    const d = await terbitkan()
    const id = d.permohonan.id
    const hasil = await detailDari(await aksi('tandai-diambil', id, {}, 'operator'))
    expect(hasil.permohonan.diambil).toMatchObject({ pada: '2026-09-24T09:00:00+07:00', oleh: { id: 'pgn_rosmiati' } })
    expect(hasil.permohonan.status).toBe('selesai')
    expect((await riwayatDb(id)).at(-1)).toMatchObject({ kejadian: 'tandai-diambil', catatan: null })
    const lagi = await aksi('tandai-diambil', id, {}, 'operator')
    expect(lagi.status).toBe(409)
    expect((await galat(lagi)).message).toBe(PESAN_BERUBAH)
    expect((await riwayatDb(id)).filter((r) => r.kejadian === 'tandai-diambil')).toHaveLength(1)
  })

  it('sesudah dibatalkan 409 (hanya surat Selesai), dan surat yang belum terbit 409', async () => {
    const d = await terbitkan()
    await detailDari(await aksi('batalkan', d.permohonan.id, { alasan: 'Salah nama' }, 'kades'))
    expect((await aksi('tandai-diambil', d.permohonan.id, {}, 'operator')).status).toBe(409)
    expect((await barisDb(d.permohonan.id)).diambil).toBeNull()
  })

  it('dua penanda serentak: satu menang', async () => {
    const d = await terbitkan()
    const id = d.permohonan.id
    const [x, y] = await Promise.all([aksi('tandai-diambil', id, {}, 'operator'), aksi('tandai-diambil', id, {}, 'kades')])
    expect([x.status, y.status].sort()).toEqual([200, 409])
    expect((await riwayatDb(id)).filter((r) => r.kejadian === 'tandai-diambil')).toHaveLength(1)
  })

  it('Kaur Keuangan ditolak di gerbang pertama', async () => {
    const d = await terbitkan()
    const r = await aksi('tandai-diambil', d.permohonan.id, {}, 'kaur')
    expect(r.status).toBe(403)
    expect((await galat(r)).message).toBe('Peran Anda tidak berhak membuka Layanan Surat.')
  })
})

describe('kirim WhatsApp (rencana 8F2b Tugas 7, Ruling 14)', () => {
  it('pengirim menerima nomor lengkap dan pesan tanpa NIK; riwayat hanya memuat nomor tersamar; boleh berulang', async () => {
    const d = await terbitkan()
    const id = d.permohonan.id
    const nomor = d.permohonan.terbit?.nomor as string
    const hasil = await detailDari(await aksi('kirim-wa', id, {}, 'operator'))
    expect(terkirim).toHaveLength(1)
    expect(terkirim[0]).toMatchObject({ desaId: ID_SUNGAI_SIALANG, ke: TELEPON })
    expect(terkirim[0].pesan).toContain('Jenis Serah Terima')
    expect(terkirim[0].pesan).toContain(nomor)
    expect(terkirim[0].pesan).not.toMatch(/[0-9]{16}/)
    const catatan = hasil.permohonan.riwayat.at(-1)
    expect(catatan).toMatchObject({ kejadian: 'kirim-wa', catatan: `Ke ${samarkanTelepon(TELEPON)}` })
    expect(catatan?.catatan).not.toContain(TELEPON)
    expect(catatan?.catatan).not.toMatch(/[0-9]{10}/)
    expect(JSON.stringify(await riwayatDb(id))).not.toContain(TELEPON)
    await detailDari(await aksi('kirim-wa', id, {}, 'kades'))
    expect(terkirim).toHaveLength(2)
  })

  it('pemohon tanpa telepon 422 dan tidak ada yang terkirim', async () => {
    await aturTelepon(null)
    const d = await terbitkan()
    const sebelum = await riwayatDb(d.permohonan.id)
    const r = await aksi('kirim-wa', d.permohonan.id, {}, 'operator')
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toBe(PESAN_TANPA_WA)
    expect(terkirim).toHaveLength(0)
    expect(await riwayatDb(d.permohonan.id)).toEqual(sebelum)
  })

  it('hanya surat Selesai: yang belum terbit atau sudah dibatalkan 409', async () => {
    const d = await terbitkan()
    await detailDari(await aksi('batalkan', d.permohonan.id, { alasan: 'Salah nama' }, 'kades'))
    const r = await aksi('kirim-wa', d.permohonan.id, {}, 'operator')
    expect(r.status).toBe(409)
    expect(terkirim).toHaveLength(0)
  })
})
