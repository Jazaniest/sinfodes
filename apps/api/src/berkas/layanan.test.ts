import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { sisipkanDesaContoh } from '../../test/data-contoh'
import { jpegBuatan, pdfBuatan } from '../../test/helpers/berkas-buatan'
import type { Db } from '../basisdata/klien'
import { GalatKripto, type Penyandi } from '../kripto/penyandi'
import { bacaBerkas, simpanBerkas } from './layanan'

let uji: DbUji
let penyandi: Penyandi
const SEKARANG = new Date('2026-10-31T10:00:00+07:00')
const ID_MASUK = 'sm_berkas_a'

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  for (const desa of ['desa_a', 'desa_b']) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 2)
    await uji.sqlMigrasi.unsafe(
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
       values ('js_${desa}', '${desa}', 'SKD', 'Surat Keterangan Domisili', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
    )
    for (const n of [1, 2]) {
      await uji.sqlMigrasi.unsafe(
        `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
         values ('pm_${desa}_${n}', '${desa}', 'dsn_${desa}', 2026, ${n}, 'js_${desa}', 'online', 'pdk_${desa}_1', 'v1.abc', 'menunggu', now())`,
      )
    }
  }
  await uji.sqlMigrasi.unsafe(
    `insert into surat_masuk (id, desa_id, tahun, no_agenda, diterima, nomor, tanggal_surat, pengirim, perihal, dicatat_oleh, dicatat_pada)
     values ('${ID_MASUK}', 'desa_a', 2026, 1, '2026-10-20', '005/1', '2026-10-19', 'Camat', 'Undangan', '{"id":"u","nama":"Op"}'::jsonb, now())`,
  )
})
afterAll(async () => {
  await uji?.tutup()
})

const dalamDesa = <T>(desaId: string, f: (db: Db) => Promise<T>) => uji.klien.dalamTransaksi('desa', { desaId }, f)

const simpanLampiran = (bita: Buffer, ekstra: { id?: string; permohonanId?: string } = {}) =>
  dalamDesa('desa_a', (db) =>
    simpanBerkas(db, penyandi, {
      desaId: 'desa_a', jenis: 'lampiran', permohonanId: ekstra.permohonanId ?? 'pm_desa_a_1', tipe: 'image/jpeg', bita, sekarang: SEKARANG, id: ekstra.id,
    }),
  )

describe('simpanBerkas dan bacaBerkas (8F3 Tugas 3)', () => {
  it('lampiran: pulang-pergi identik, dengan tipe yang disimpan', async () => {
    const jpeg = jpegBuatan()
    const { id } = await simpanLampiran(jpeg)
    const hasil = await dalamDesa('desa_a', (db) => bacaBerkas(db, penyandi, { id, permohonanId: 'pm_desa_a_1' }))
    expect(hasil?.tipe).toBe('image/jpeg')
    expect(Buffer.compare(hasil!.bita, jpeg)).toBe(0)
  })

  it('id boleh ditentukan pemanggil (id lampiran dibuat sebelum permohonan disisipkan); tanpa id dibuatkan', async () => {
    expect((await simpanLampiran(jpegBuatan(), { id: 'lamp_tentu_1' })).id).toBe('lamp_tentu_1')
    expect((await simpanLampiran(jpegBuatan())).id).toMatch(/^bks_[0-9a-f-]{36}$/)
  })

  it('kolom isi berupa sandi: tidak memuat awal JPEG maupun %PDF dan tidak memuat isi aslinya; ukuran dan tipe tercatat', async () => {
    const jpeg = jpegBuatan({ komentar: 'PENANDA-RAHASIA-JPEG' })
    const pdf = pdfBuatan('/Info (PENANDA-RAHASIA-PDF)')
    const a = await simpanLampiran(jpeg)
    const b = await dalamDesa('desa_a', (db) =>
      simpanBerkas(db, penyandi, { desaId: 'desa_a', jenis: 'scan', suratMasukId: ID_MASUK, tipe: 'application/pdf', bita: pdf, sekarang: SEKARANG }),
    )
    const [baris] = await uji.sqlMigrasi`select id, jenis, tipe, ukuran_byte, isi from berkas_surat where id = ${a.id}`
    expect(baris).toMatchObject({ jenis: 'lampiran', tipe: 'image/jpeg', ukuran_byte: jpeg.length })
    const isiJpeg = baris.isi as Buffer
    expect(isiJpeg.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(false)
    expect(isiJpeg.includes(jpeg)).toBe(false)
    expect(isiJpeg.includes(Buffer.from('PENANDA-RAHASIA-JPEG'))).toBe(false)
    const [barisPdf] = await uji.sqlMigrasi`select jenis, tipe, ukuran_byte, isi, surat_masuk_id from berkas_surat where id = ${b.id}`
    expect(barisPdf).toMatchObject({ jenis: 'scan', tipe: 'application/pdf', ukuran_byte: pdf.length, surat_masuk_id: ID_MASUK })
    expect((barisPdf.isi as Buffer).includes(Buffer.from('%PDF'))).toBe(false)
    expect((barisPdf.isi as Buffer).includes(Buffer.from('PENANDA-RAHASIA-PDF'))).toBe(false)
  })

  it('pindaian dibaca lewat id surat masuk', async () => {
    const pdf = pdfBuatan()
    const { id } = await dalamDesa('desa_a', (db) =>
      simpanBerkas(db, penyandi, { desaId: 'desa_a', jenis: 'scan', suratMasukId: ID_MASUK, tipe: 'application/pdf', bita: pdf, sekarang: SEKARANG }),
    )
    const hasil = await dalamDesa('desa_a', (db) => bacaBerkas(db, penyandi, { id, suratMasukId: ID_MASUK }))
    expect(hasil?.tipe).toBe('application/pdf')
    expect(Buffer.compare(hasil!.bita, pdf)).toBe(0)
  })

  it('membaca dengan rujukan yang salah mengembalikan undefined: permohonan lain, id lain, atau jenis rujukan yang salah', async () => {
    const { id } = await simpanLampiran(jpegBuatan())
    const baca = (where: Parameters<typeof bacaBerkas>[2]) => dalamDesa('desa_a', (db) => bacaBerkas(db, penyandi, where))
    expect(await baca({ id, permohonanId: 'pm_desa_a_2' })).toBeUndefined()
    expect(await baca({ id: 'bks_tidak_ada', permohonanId: 'pm_desa_a_1' })).toBeUndefined()
    expect(await baca({ id, suratMasukId: ID_MASUK })).toBeUndefined()
  })

  it('berkas desa lain tidak terbaca (RLS) walau id dan rujukannya benar', async () => {
    const { id } = await simpanLampiran(jpegBuatan())
    expect(await dalamDesa('desa_b', (db) => bacaBerkas(db, penyandi, { id, permohonanId: 'pm_desa_a_1' }))).toBeUndefined()
  })

  it('tidak bisa menyimpan atas nama desa lain (RLS)', async () => {
    await expect(
      dalamDesa('desa_b', (db) =>
        simpanBerkas(db, penyandi, { desaId: 'desa_a', jenis: 'lampiran', permohonanId: 'pm_desa_a_1', tipe: 'image/jpeg', bita: jpegBuatan(), sekarang: SEKARANG }),
      ),
    ).rejects.toThrow()
  })

  it('sandi yang dipindah ke baris lain tidak terbuka (id baris ikut diautentikasi)', async () => {
    const a = await simpanLampiran(jpegBuatan({ komentar: 'A' }))
    const b = await simpanLampiran(jpegBuatan({ komentar: 'B' }))
    await uji.sqlMigrasi`update berkas_surat set isi = (select isi from berkas_surat where id = ${a.id}) where id = ${b.id}`
    await expect(dalamDesa('desa_a', (db) => bacaBerkas(db, penyandi, { id: b.id, permohonanId: 'pm_desa_a_1' }))).rejects.toThrow(GalatKripto)
  })

  it('berkas 3 MB acak pulang-pergi identik', async () => {
    const besar = Buffer.concat([jpegBuatan().subarray(0, 2), randomBytes(3 * 1024 * 1024)])
    const { id } = await simpanLampiran(besar)
    const hasil = await dalamDesa('desa_a', (db) => bacaBerkas(db, penyandi, { id, permohonanId: 'pm_desa_a_1' }))
    expect(Buffer.compare(hasil!.bita, besar)).toBe(0)
  })

  it('berkas kosong atau lebih dari 5 MB ditolak sebelum menyentuh basis data', async () => {
    await expect(simpanLampiran(Buffer.alloc(0))).rejects.toThrow()
    await expect(simpanLampiran(Buffer.alloc(5 * 1024 * 1024 + 1, 1))).rejects.toThrow()
  })
})
