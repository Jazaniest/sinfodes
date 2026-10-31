import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilKirimPermohonanSchema } from '@sinfodes/kontrak/warga/ajukan'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { jpegBuatan, pdfBuatan } from '../../../test/helpers/berkas-buatan'
import { ambil, rakitApp, sisipAksesUji, sisipSesiBantuanUji, sisipSesiUji, sisipSesiWargaUji } from '../../../test/rakit-app'
import { bersihkanMetadata } from '../../berkas/bersihkan'
import { CSP_BERKAS, PESAN_BERKAS_BANTUAN, PESAN_BERKAS_TIDAK_TERSIMPAN } from '../../berkas/jawab'
import { simpanBerkas } from '../../berkas/layanan'
import type { Penyandi } from '../../kripto/penyandi'

const SS = 'http://sungaisialang.sinfodes.localhost'
const SITI = 'pdk_siti_rahmah'
const PESAN_TIDAK_BOLEH_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const SYARAT = ['KTP', 'KK', 'Pengantar RT']

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let kuki: Record<'operator' | 'sekdes' | 'kades' | 'kaur' | 'kadusSama' | 'kadusLain' | 'bantuan' | 'bantuanTerbuka' | 'warga', string>
let id = ''
let lampiran: { id: string; berkas: string }[] = []
const jpegAsli = jpegBuatan({ exif: true })

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const dibuat = new Date(SEKARANG_UJI.getTime() - 3600_000)
  const sepuluhMenit = new Date(SEKARANG_UJI.getTime() - 600_000)
  const panel = async (penggunaId: string) => (await sisipSesiUji(uji.sqlMigrasi, { penggunaId, desaId: ID_SUNGAI_SIALANG, dibuat })).kuki
  // Siti tinggal di dusun I; satu-satunya Kepala Dusun bawaan memegang dusun II, jadi dusun I diberi satu lagi untuk uji ini.
  await uji.sqlMigrasi`insert into pengguna (id, desa_id, nama, jabatan, peran, dusun_id, email, aktif, kata_sandi_hash, dibuat)
    values ('pgn_kadus_uji', ${ID_SUNGAI_SIALANG}, 'Kadus Satu Uji', 'Kepala Dusun I', 'kadus', 'dsn_ss_1', 'kadus1@sungaisialang.desa.id', true, '$argon2id$x', now())`
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, sembunyikan: true, mulai: dibuat })
  const aksesTerbuka = await sisipAksesUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, sembunyikan: false, mulai: dibuat })
  kuki = {
    operator: await panel('pgn_rosmiati'), sekdes: await panel('pgn_hendri'), kades: await panel('pgn_nasir'), kaur: await panel('pgn_nurhayati'),
    kadusSama: await panel('pgn_kadus_uji'), kadusLain: await panel('pgn_sukardi'),
    bantuan: (await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, aksesId: akses.id, dibuat: sepuluhMenit })).kuki,
    bantuanTerbuka: (await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, aksesId: aksesTerbuka.id, dibuat: sepuluhMenit })).kuki,
    warga: (await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId: SITI, desaId: ID_SUNGAI_SIALANG, dibuat })).kuki,
  }

  // Foto diunggah lewat rute warga sungguhan, jadi yang dibuka petugas adalah byte yang benar-benar tersimpan.
  await uji.sqlMigrasi`update permohonan set status = 'diproses' where status = 'menunggu' and desa_id = ${ID_SUNGAI_SIALANG}`
  const form = new FormData()
  form.set('data', JSON.stringify({ kunci: 'kunci-lampiran-0001', jenisId: 'js_ss_skd', untukId: SITI, isian: { keperluan: 'Beasiswa' }, lampiran: SYARAT.map((syarat) => ({ syarat })) }))
  for (let i = 0; i < SYARAT.length; i++) form.append('lampiran', new File([i === 0 ? jpegAsli : jpegBuatan()], 'asli.jpg', { type: 'image/jpeg' }))
  const res = await app.fetch(new Request(`${SS}/api/v1/warga/permohonan`, { method: 'POST', headers: { Origin: SS, Cookie: kuki.warga }, body: form }))
  expect(res.status).toBe(201)
  id = hasilKirimPermohonanSchema.parse(await res.json()).id
  const [p] = await uji.sqlMigrasi`select lampiran from permohonan where id = ${id}`
  lampiran = p.lampiran as typeof lampiran
})
afterAll(async () => {
  await uji?.tutup()
})

const buka = (k: string | null, permohonan = id, lampiranId = lampiran[0]?.id) => ambil(app, `${SS}/api/v1/permohonan/${permohonan}/lampiran/${lampiranId}`, k)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error

describe('GET /permohonan/:id/lampiran/:lampiranId (8F3 Ruling 3, 7, 10)', () => {
  it.each(['operator', 'sekdes', 'kades', 'kadusSama'] as const)('%s membuka foto: 200 dengan byte hasil pembersihan dan header penutup', async (peran) => {
    const res = await buka(kuki[peran])
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Content-Security-Policy')).toBe(CSP_BERKAS)
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="ktp.jpg"')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('Content-Length')).toBe(String((await res.clone().arrayBuffer()).byteLength))
    const bita = Buffer.from(await res.arrayBuffer())
    expect(Buffer.compare(bita, bersihkanMetadata(jpegAsli, 'image/jpeg'))).toBe(0)
    expect(bita.toString('latin1')).not.toContain('GPS')
  })

  it('CSP berkas membolehkan gambar sendiri dan menutup yang lain', () => {
    expect(CSP_BERKAS).toBe("default-src 'none'; img-src 'self'; sandbox; frame-ancestors 'none'")
  })

  it('Kepala Dusun dusun lain: 404 sama dengan permohonan yang tidak ada', async () => {
    const lain = await buka(kuki.kadusLain)
    const tidakAda = await buka(kuki.kadusLain, 'srt_tidak_ada')
    expect(lain.status).toBe(404)
    expect(await lain.text()).toBe(await tidakAda.text())
  })

  it('Kaur Keuangan ditolak di gerbang pertama; warga dan tanpa sesi 401', async () => {
    const kaur = await buka(kuki.kaur)
    expect(kaur.status).toBe(403)
    expect((await galat(kaur)).message).toBe(PESAN_TIDAK_BOLEH_LIHAT)
    expect((await buka(kuki.warga)).status).toBe(401)
    expect((await buka(null)).status).toBe(401)
  })

  it('sesi bantuan Tim Sinfodes: 403 dengan pesan tersendiri, juga bila penyamaran data pribadi dimatikan', async () => {
    for (const k of [kuki.bantuan, kuki.bantuanTerbuka]) {
      const res = await buka(k)
      expect(res.status).toBe(403)
      expect((await galat(res)).message).toBe(PESAN_BERKAS_BANTUAN)
    }
  })

  it('id lampiran dari permohonan lain lewat id permohonan yang berhak: 404; lampiran yang tidak ada: 404', async () => {
    const [lain] = await uji.sqlMigrasi`select id, lampiran from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and id <> ${id} and jsonb_array_length(lampiran) > 0 limit 1`
    const idLampiranLain = (lain.lampiran as { id: string }[])[0].id
    expect((await buka(kuki.operator, id, idLampiranLain)).status).toBe(404)
    expect((await buka(kuki.operator, id, 'lmp_tidak_ada')).status).toBe(404)
    // Kebalikannya: id lampiran sendiri lewat permohonan orang lain pun 404.
    expect((await buka(kuki.operator, lain.id as string, lampiran[0].id)).status).toBe(404)
  })

  it('lampiran dari data contoh (hanya nama dan ukuran) dan permohonan loket tanpa lampiran: 404', async () => {
    const [contoh] = await uji.sqlMigrasi`select id, lampiran from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and id <> ${id} and kanal = 'online' and jsonb_array_length(lampiran) > 0 limit 1`
    const tanpaIsi = await buka(kuki.operator, contoh.id as string, (contoh.lampiran as { id: string }[])[0].id)
    expect(tanpaIsi.status).toBe(404)
    expect((await galat(tanpaIsi)).message).toBe(PESAN_BERKAS_TIDAK_TERSIMPAN)
    const [loket] = await uji.sqlMigrasi`select id from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and kanal = 'loket' and jsonb_array_length(lampiran) = 0 limit 1`
    expect((await buka(kuki.operator, loket.id as string, 'lmp_x')).status).toBe(404)
  })

  it('PDF disajikan sebagai unduhan dengan tipe tetap, bukan inline', async () => {
    const pdf = pdfBuatan()
    const idPdf = 'lmp_uji_pdf'
    await uji.klien.dalamTransaksi('desa', { desaId: ID_SUNGAI_SIALANG }, (db) =>
      simpanBerkas(db, penyandi, { desaId: ID_SUNGAI_SIALANG, jenis: 'lampiran', permohonanId: id, tipe: 'application/pdf', bita: pdf, sekarang: SEKARANG_UJI, id: idPdf }),
    )
    await uji.sqlMigrasi`update permohonan set lampiran = lampiran || ${uji.sqlMigrasi.json([{ id: idPdf, syarat: 'Pengantar RT', berkas: 'pengantar.pdf', ukuranKb: 1 }])}::jsonb where id = ${id}`
    const res = await buka(kuki.operator, id, idPdf)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="pengantar.pdf"')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Content-Security-Policy')).toBe(CSP_BERKAS)
    expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), pdf)).toBe(0)
  })

  it('nama berkas dengan karakter aneh tidak merusak header unduhan', async () => {
    const aneh = 'surat "undangan"\r\nX-Suntik: 1 é.pdf'
    const idAneh = 'lmp_uji_aneh'
    await uji.klien.dalamTransaksi('desa', { desaId: ID_SUNGAI_SIALANG }, (db) =>
      simpanBerkas(db, penyandi, { desaId: ID_SUNGAI_SIALANG, jenis: 'lampiran', permohonanId: id, tipe: 'application/pdf', bita: pdfBuatan(), sekarang: SEKARANG_UJI, id: idAneh }),
    )
    await uji.sqlMigrasi`update permohonan set lampiran = lampiran || ${uji.sqlMigrasi.json([{ id: idAneh, syarat: 'KK', berkas: aneh, ukuranKb: 1 }])}::jsonb where id = ${id}`
    const res = await buka(kuki.operator, id, idAneh)
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Suntik')).toBeNull()
    const disposisi = res.headers.get('Content-Disposition') ?? ''
    expect(disposisi).not.toMatch(/[\r\n]/)
    expect(disposisi.startsWith('attachment; filename="')).toBe(true)
    expect(disposisi).toContain("filename*=UTF-8''")
    expect(disposisi).toContain('%C3%A9')
  })
})
