import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { pengaturanBawaan } from '@sinfodes/kontrak/surat/pengaturan-bawaan'
import { jenisDenganPakaiSchema, STATUS_DAFTAR_JENIS, statusJenis } from '@sinfodes/kontrak/surat/jenis'
import { detailJenisSuratSchema } from '@sinfodes/kontrak/surat/ubah-jenis'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const daftarSchema = z.object({ data: jenisDenganPakaiSchema.array(), meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }) })

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<string, string> = {}
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  const akun: [string, string, string][] = [
    ['operator', SS, 'rosmiati@sungaisialang.desa.id'], ['sekdes', SS, 'hendri@sungaisialang.desa.id'], ['kades', SS, 'kades@sungaisialang.desa.id'],
    ['kaur', SS, 'nurhayati@sungaisialang.desa.id'], ['kadus', SS, 'sukardi@sungaisialang.desa.id'], ['operatorTl', TL, 'operator@tanjunglamo.desa.id'],
  ]
  for (const [i, [nama, basis, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, basis, surel, 'demo', `10.8.0.${i + 1}`)).kuki as string
  // Satu jenis buatan desa yang sudah diarsipkan (jenis arsip selalu mati), di urutan terakhir katalog Sungai Sialang.
  await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal, diarsipkan)
    values ('js_uji_arsip', ${ID_SUNGAI_SIALANG}, 'ARSP', 'Surat arsip uji', '470', 'pemohon', '[]'::jsonb, false, false, false, '[]'::jsonb, 'Teks', false, 'desa', '2026-10-01T03:00:00Z')`
})
afterAll(async () => {
  await uji?.tutup()
})

const katalogSs = () => dunia.jenisSurat.filter((j) => j.desaId === ID_SUNGAI_SIALANG)
const daftar = async (peran: string, query = '', basis = SS) => ambil(app, `${basis}/api/v1/jenis-surat${query}`, kuki[peran])
const galat = async (r: Response) => galatSchema.parse(await r.json()).error

describe('GET /jenis-surat (rencana 8F1 Tugas 4)', () => {
  it('memuat seluruh katalog desa dalam urutan semai, belum dipakai siapa pun, dalam satu halaman', async () => {
    const r = await daftar('operator')
    expect(r.status).toBe(200)
    const badan = daftarSchema.parse(await r.json())
    expect(badan.data.map((j) => j.kode)).toEqual([...katalogSs().map((j) => j.kode), 'ARSP'])
    expect(badan.meta).toEqual({ page: 1, pageSize: badan.data.length, total: badan.data.length })
    for (const j of badan.data) expect({ pakai: j.jumlahPakai, dipakai: j.dipakai, desa: j.desaId }, j.kode).toEqual({ pakai: 0, dipakai: false, desa: ID_SUNGAI_SIALANG })
    const contoh = katalogSs()[0]
    expect(badan.data[0]).toEqual({ ...contoh, jumlahPakai: 0, dipakai: false })
  })

  it('waktu arsip ditulis ISO WIB, bukan UTC', async () => {
    const badan = daftarSchema.parse(await (await daftar('operator')).json())
    expect(badan.data.find((j) => j.id === 'js_uji_arsip')?.diarsipkan).toBe('2026-10-01T10:00:00+07:00')
  })

  it('?status menyaring menurut statusJenis; arsip mengalahkan saklar aktif', async () => {
    const semua = daftarSchema.parse(await (await daftar('operator')).json()).data
    for (const status of STATUS_DAFTAR_JENIS) {
      const badan = daftarSchema.parse(await (await daftar('operator', `?status=${status}`)).json())
      expect(badan.data.map((j) => j.id), status).toEqual(semua.filter((j) => statusJenis(j) === status).map((j) => j.id))
      expect(badan.meta.total).toBe(badan.data.length)
    }
    const arsip = daftarSchema.parse(await (await daftar('operator', '?status=diarsipkan')).json())
    expect(arsip.data.map((j) => j.id)).toEqual(['js_uji_arsip'])
  })

  it('status tidak dikenal 422 pada field status', async () => {
    for (const status of ['salah', '', 'AKTIF']) {
      const r = await daftar('operator', `?status=${status}`)
      expect(r.status, status).toBe(422)
      expect(await galat(r), status).toMatchObject({ code: 'VALIDATION', fields: { status: 'Status jenis surat tidak dikenal.' } })
    }
  })

  it('jenis desa lain tidak terbaca: Tanjung Lamo hanya melihat katalognya sendiri', async () => {
    const badan = daftarSchema.parse(await (await daftar('operatorTl', '', TL)).json())
    expect(badan.data.length).toBe(dunia.jenisSurat.filter((j) => j.desaId === 'desa_tanjung_lamo').length)
    expect(badan.data.every((j) => j.desaId === 'desa_tanjung_lamo')).toBe(true)
    expect(badan.data.some((j) => j.id === 'js_uji_arsip')).toBe(false)
  })

  it('hak surat.lihat: Operator, Sekretaris, Kepala Desa, dan Kepala Dusun membaca; Kaur Keuangan 403; tanpa sesi 401', async () => {
    for (const peran of ['operator', 'sekdes', 'kades', 'kadus']) expect((await daftar(peran)).status, peran).toBe(200)
    const kaur = await daftar('kaur')
    expect(kaur.status).toBe(403)
    expect(await galat(kaur)).toMatchObject({ code: 'FORBIDDEN', message: PESAN_LIHAT })
    expect((await ambil(app, `${SS}/api/v1/jenis-surat`)).status).toBe(401)
  })
})

describe('GET /jenis-surat/:id (rencana 8F1 Tugas 4)', () => {
  const detail = (peran: string, id: string, basis = SS) => ambil(app, `${basis}/api/v1/jenis-surat/${id}`, kuki[peran])

  it('memuat jenis, contoh pemohon tanpa NIK, pengaturan desa, dan pejabat', async () => {
    const jenis = katalogSs()[0]
    const r = await detail('operator', jenis.id)
    expect(r.status).toBe(200)
    const badan = detailJenisSuratSchema.parse(await r.json())
    expect(badan.jenis).toEqual({ ...jenis, jumlahPakai: 0, dipakai: false })
    expect(badan.contoh).toMatchObject({ tiruan: true, subjek: null, mutasi: null, isian: {} })
    expect(badan.contoh.pemohon).toMatchObject({ nik: null, nama: 'Nama Pemohon', desaId: ID_SUNGAI_SIALANG })
    const bawaan = dunia.pengaturanSurat.find((p) => p.desaId === ID_SUNGAI_SIALANG) ?? pengaturanBawaan(ID_SUNGAI_SIALANG)
    expect(badan.pengaturan).toEqual(bawaan)
    expect(badan.pejabat).toEqual({ kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra', nipKades: null })
  })

  it('jawaban tidak memuat satu pun deretan 16 angka (tidak ada NIK)', async () => {
    for (const j of katalogSs().slice(0, 4)) expect(await (await detail('operator', j.id)).text(), j.kode).not.toMatch(/(?<!\d)\d{16}(?!\d)/)
  })

  it('jenis arsip terbaca dengan waktu arsip ISO WIB', async () => {
    const badan = detailJenisSuratSchema.parse(await (await detail('operator', 'js_uji_arsip')).json())
    expect(badan.jenis).toMatchObject({ aktif: false, diarsipkan: '2026-10-01T10:00:00+07:00', asal: 'desa' })
  })

  it('id tidak ada atau milik desa lain 404 "Jenis surat tidak ditemukan."', async () => {
    const milikTl = dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo')
    expect(milikTl).toBeDefined()
    for (const id of ['js_tidak_ada', milikTl?.id as string, 'js_uji_arsip%2F..']) {
      const r = await detail('operator', id)
      expect(r.status, id).toBe(404)
      expect(await galat(r), id).toMatchObject({ code: 'NOT_FOUND', message: 'Jenis surat tidak ditemukan.' })
    }
    expect((await detail('operatorTl', 'js_uji_arsip', TL)).status).toBe(404)
  })

  it('hak: Kepala Dusun membaca, Kaur Keuangan 403, tanpa sesi 401', async () => {
    const id = katalogSs()[0].id
    expect((await detail('kadus', id)).status).toBe(200)
    const kaur = await detail('kaur', id)
    expect(kaur.status).toBe(403)
    expect(await galat(kaur)).toMatchObject({ message: PESAN_LIHAT })
    expect((await ambil(app, `${SS}/api/v1/jenis-surat/${id}`)).status).toBe(401)
  })

  it('pejabat memakai pengguna aktif; tanda "—" bila belum ada, dan akun nonaktif tidak dihitung', async () => {
    const id = dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo')?.id as string
    const sebelum = detailJenisSuratSchema.parse(await (await detail('operatorTl', id, TL)).json()).pejabat
    const kades = dunia.pengguna.find((p) => p.desaId === 'desa_tanjung_lamo' && p.peran === 'kades' && p.aktif)
    expect(sebelum.kades).toBe(kades?.nama ?? '—')
    await uji.sqlMigrasi`update pengguna set aktif = false where desa_id = ${ID_SUNGAI_SIALANG} and peran = 'kades'`
    const sesudah = detailJenisSuratSchema.parse(await (await detail('operator', katalogSs()[0].id)).json()).pejabat
    expect(sesudah).toEqual({ kades: '—', sekdes: 'Hendri Saputra', nipKades: null })
    await uji.sqlMigrasi`update pengguna set aktif = true where desa_id = ${ID_SUNGAI_SIALANG} and peran = 'kades'`
  })

  it('desa tanpa baris pengaturan_surat memakai pengaturan bawaan tanpa menulis baris', async () => {
    await uji.sqlMigrasi`delete from pengaturan_surat where desa_id = 'desa_tanjung_lamo'`
    const id = dunia.jenisSurat.find((j) => j.desaId === 'desa_tanjung_lamo')?.id as string
    const badan = detailJenisSuratSchema.parse(await (await detail('operatorTl', id, TL)).json())
    expect(badan.pengaturan).toEqual(pengaturanBawaan('desa_tanjung_lamo'))
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from pengaturan_surat where desa_id = 'desa_tanjung_lamo'`)[0].n)).toBe(0)
  })
})
