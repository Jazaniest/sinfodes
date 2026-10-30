import { galatSchema } from '@sinfodes/kontrak/api'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { PESAN_PASSPHRASE_SAMA } from '@sinfodes/kontrak/surat/passphrase'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimDenganMetode, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import { PESAN_PANEL_DITANGGUHKAN, PESAN_SESI_BERAKHIR } from '../../lapisan/akses'
import { PESAN_TERLALU_SERING } from '../../lapisan/batas-laju'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const URL_PP = '/api/v1/sesi/passphrase-tanda-tangan'
const PESAN_TIDAK_BERHAK = 'Peran Anda tidak menandatangani surat.'
const ID = { kades: 'pgn_nasir', sekdes: 'pgn_hendri' } as const

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<string, string> = {}
beforeAll(async () => {
  uji = await buatDbUji()
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  const akun: [string, string][] = [
    ['operator', 'rosmiati'], ['sekdes', 'hendri'], ['kades', 'kades'], ['kaur', 'nurhayati'], ['kadus', 'sukardi'],
  ]
  for (const [i, [nama, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, SS, `${surel}@sungaisialang.desa.id`, 'demo', `10.13.0.${i + 1}`)).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from passphrase_tanda_tangan`
  await uji.sqlMigrasi`delete from kunci_masuk_desa where jenis = 'passphrase'`
  await uji.sqlMigrasi`delete from jejak_audit where jenis like 'passphrase.%'`
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const bacaStatus = (peran: string | null) => ambil(app, `${SS}${URL_PP}`, peran === null ? null : kuki[peran])
const atur = (peran: string | null, badan: unknown, ap = app) => kirimDenganMetode(ap, 'PUT', SS, URL_PP, badan, peran === null ? null : kuki[peran])
const SAH = { kataSandi: 'demo', passphrase: 'sialang2026' }
const hashDb = async (id: string) => (await uji.sqlMigrasi`select hash, diatur_pada, desa_id from passphrase_tanda_tangan where pengguna_id = ${id}`)[0]
const kunciDb = async () => (await uji.sqlMigrasi`select jenis, gagal, kali_terkunci from kunci_masuk_desa where desa_id = ${DESA_SS} and jenis = 'passphrase'`).map((b) => ({ ...b }))
const auditDb = async (jenis: string) => (await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit where jenis = ${jenis} order by waktu`).map((b) => ({ ...b }))

describe('GET dan PUT /sesi/passphrase-tanda-tangan (rencana 8F2b Tugas 3)', () => {
  it('status belum diatur, PUT menetapkan hash argon2id, status berubah menjadi diatur', async () => {
    const awal = await bacaStatus('kades')
    expect(awal.status).toBe(200)
    expect(await awal.json()).toEqual({ diatur: false })
    const r = await atur('kades', SAH)
    expect(r.status, JSON.stringify(await r.clone().json())).toBe(200)
    expect(await r.json()).toEqual({ diatur: true })
    expect(await (await bacaStatus('kades')).json()).toEqual({ diatur: true })
    const b = await hashDb(ID.kades)
    expect(b.hash).toMatch(/^\$argon2id\$/)
    expect(b.hash).not.toContain('sialang2026')
    expect(new Date(b.diatur_pada as string).getTime()).toBe(SEKARANG_UJI.getTime())
    expect(b.desa_id).toBe(DESA_SS)
    expect(await auditDb('passphrase.diatur')).toEqual([{ pelaku: ID.kades, ringkasan: {} }])
    expect(JSON.stringify(await auditDb('passphrase.diatur'))).not.toContain('sialang2026')
  })

  it('PUT kedua mengganti hash, dan status Sekdes terpisah dari Kades', async () => {
    await atur('kades', SAH)
    const pertama = (await hashDb(ID.kades)).hash
    await atur('kades', { kataSandi: 'demo', passphrase: 'sialang-baru-2026' })
    const kedua = (await hashDb(ID.kades)).hash
    expect(kedua).not.toBe(pertama)
    expect(await (await bacaStatus('sekdes')).json()).toEqual({ diatur: false })
    expect((await atur('sekdes', SAH)).status).toBe(200)
    expect((await uji.sqlMigrasi`select count(*)::int as n from passphrase_tanda_tangan`)[0].n).toBe(2)
  })

  it('kata sandi akun salah 422 pada field kataSandi, dihitung, hash tidak berubah, jejak tersimpan walau 422', async () => {
    const r = await atur('kades', { kataSandi: 'salah', passphrase: 'sialang2026' })
    expect(r.status).toBe(422)
    expect(await galat(r)).toEqual({ code: 'VALIDATION', message: 'Kata sandi salah.', fields: { kataSandi: 'Kata sandi salah.' } })
    expect(await hashDb(ID.kades)).toBeUndefined()
    expect(await kunciDb()).toEqual([{ jenis: 'passphrase', gagal: 1, kali_terkunci: 0 }])
    expect(await auditDb('passphrase.gagal')).toEqual([{ pelaku: ID.kades, ringkasan: { alasan: 'kata-sandi-salah' } }])
    expect(await auditDb('passphrase.diatur')).toEqual([])
  })

  it('lima kata sandi salah mengunci: yang kelima 429, yang keenam 429 walau kata sandinya benar; akun lain tidak terkunci', async () => {
    for (let i = 1; i <= 4; i++) expect((await atur('kades', { kataSandi: 'salah', passphrase: 'sialang2026' })).status, `salah ke-${i}`).toBe(422)
    const kelima = await atur('kades', { kataSandi: 'salah', passphrase: 'sialang2026' })
    expect(kelima.status).toBe(429)
    expect((await galat(kelima)).message).toBe(PESAN_TERLALU_SERING)
    const benar = await atur('kades', SAH)
    expect(benar.status).toBe(429)
    expect(await hashDb(ID.kades)).toBeUndefined()
    expect((await atur('sekdes', SAH)).status).toBe(200)
  })

  it('kata sandi benar menghapus hitungan', async () => {
    await atur('kades', { kataSandi: 'salah', passphrase: 'sialang2026' })
    await atur('kades', { kataSandi: 'salah', passphrase: 'sialang2026' })
    expect((await kunciDb())[0].gagal).toBe(2)
    expect((await atur('kades', SAH)).status).toBe(200)
    expect(await kunciDb()).toEqual([])
  })

  it('passphrase pendek, terlalu panjang, atau sama dengan kata sandi 422 per field dan tidak dihitung', async () => {
    const pendek = await atur('kades', { kataSandi: 'demo', passphrase: 'pendek' })
    expect(pendek.status).toBe(422)
    expect((await galat(pendek)).fields).toEqual({ passphrase: 'Passphrase minimal 8 karakter.' })
    const panjang = await atur('kades', { kataSandi: 'demo', passphrase: 'a'.repeat(129) })
    expect((await galat(panjang)).fields).toEqual({ passphrase: 'Passphrase paling banyak 128 karakter.' })
    const sama = await atur('kades', { kataSandi: 'demo', passphrase: 'demo' })
    expect(sama.status).toBe(422)
    const sama2 = await atur('kades', { kataSandi: 'demo-demo', passphrase: 'demo-demo' })
    expect((await galat(sama2)).fields).toEqual({ passphrase: PESAN_PASSPHRASE_SAMA })
    const kosong = await atur('kades', { passphrase: 'sialang2026' })
    expect((await galat(kosong)).fields).toHaveProperty('kataSandi')
    expect(await kunciDb()).toEqual([])
    expect(await hashDb(ID.kades)).toBeUndefined()
  })

  it('tanpa sesi 401; Operator, Kaur Keuangan, dan Kepala Dusun 403 pada GET dan PUT', async () => {
    for (const lewat of [() => bacaStatus(null), () => atur(null, SAH)]) {
      const r = await lewat()
      expect(r.status).toBe(401)
      expect((await galat(r)).message).toBe(PESAN_SESI_BERAKHIR)
    }
    for (const peran of ['operator', 'kaur', 'kadus']) {
      for (const r of [await bacaStatus(peran), await atur(peran, SAH)]) {
        expect(r.status, peran).toBe(403)
        expect((await galat(r)).message, peran).toBe(PESAN_TIDAK_BERHAK)
      }
    }
  })

  it('desa Ditangguhkan menolak PUT, GET tetap boleh', async () => {
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${DESA_SS}`
    try {
      // Aplikasi baru: cache alamat 30 detik aplikasi lama tidak ikut.
      const baru = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
      const put = await atur('kades', SAH, baru)
      expect(put.status).toBe(403)
      expect((await galat(put)).message).toBe(PESAN_PANEL_DITANGGUHKAN)
      const baca = await ambil(baru, `${SS}${URL_PP}`, kuki.kades)
      expect(baca.status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${DESA_SS}`
    }
  })

  it('asal asing ditolak CSRF', async () => {
    const r = await app.fetch(
      new Request(`${SS}${URL_PP}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: 'http://jahat.example', Cookie: kuki.kades }, body: JSON.stringify(SAH) }),
    )
    expect(r.status).toBe(403)
    expect(await hashDb(ID.kades)).toBeUndefined()
  })
})
