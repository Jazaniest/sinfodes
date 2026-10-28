import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { barisKeluargaSchema, detailKeluargaSchema, type BarisKeluarga } from '@sinfodes/kontrak/keluarga/schema'
import { ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const NIK_SITI = '1405095203918002'
const KK_SYAHRIAL = '1405092011238004'
const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data keluarga.'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let kukiOperator: string
let kukiKadus: string
let kukiKaur: string
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  kukiOperator = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.8.0.1')).kuki as string
  kukiKadus = (await masukLewatRute(app, SS, 'sukardi@sungaisialang.desa.id', 'demo', '10.8.0.2')).kuki as string
  kukiKaur = (await masukLewatRute(app, SS, 'nurhayati@sungaisialang.desa.id', 'demo', '10.8.0.3')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

const skemaDaftar = daftarSchema(barisKeluargaSchema)

/** Baris KK yang seharusnya, dihitung dari dunia demo seperti handler tiruan (anggota = anggotaIds, urut nama kepala lalu nomor KK). */
function harapan(dusunSaja: string | null = null): BarisKeluarga[] {
  const perId = new Map(dunia.penduduk.map((p) => [p.id, p] as const))
  return dunia.keluarga
    .filter((k) => k.desaId === ID_SUNGAI_SIALANG && k.anggotaIds.length > 0 && (dusunSaja === null || k.dusunId === dusunSaja))
    .map((k) => {
      const anggota = k.anggotaIds.map((id) => perId.get(id)).filter((p): p is NonNullable<typeof p> => p !== undefined)
      return {
        ...k,
        namaKepala: perId.get(k.kepalaKeluargaId)?.nama ?? '',
        jumlahAnggota: anggota.length,
        diperbaruiPada: anggota.reduce((maks, p) => (p.diubahPada > maks ? p.diubahPada : maks), anggota[0].diubahPada),
      }
    })
    .sort((a, b) => a.namaKepala.localeCompare(b.namaKepala, 'id') || a.nomorKk.localeCompare(b.nomorKk))
}

const daftar = (query: string, kuki: string | null = kukiOperator, basis = SS) => ambil(app, `${basis}/api/v1/keluarga${query}`, kuki)
const cari = (badan: unknown, kuki: string | null = kukiOperator, basis = SS) => kirimJson(app, basis, '/api/v1/keluarga/cari', badan, kuki)
const detail = (id: string, kuki: string | null = kukiOperator, basis = SS) => ambil(app, `${basis}/api/v1/keluarga/${id}`, kuki)

describe('GET /keluarga', () => {
  it('bawaan: 806 KK, 25 baris urut nama kepala lalu nomor KK, setiap kolom sama dengan dunia demo', async () => {
    const r = await daftar('')
    expect(r.status).toBe(200)
    const isi = skemaDaftar.parse(await r.json())
    const h = harapan()
    expect(h).toHaveLength(806)
    expect(isi.meta).toEqual({ page: 1, pageSize: 25, total: 806 })
    expect(isi.data).toEqual(h.slice(0, 25))
  })

  it('halaman 2 berukuran 100 dan filter dusun mengikuti nomor dusun', async () => {
    const h = harapan()
    const halaman = skemaDaftar.parse(await (await daftar('?page=2&pageSize=100')).json())
    expect(halaman.data).toEqual(h.slice(100, 200))
    const dusun2 = skemaDaftar.parse(await (await daftar('?dusun=2&pageSize=100')).json())
    expect(dusun2.data).toEqual(harapan('dsn_ss_2').slice(0, 100))
    expect(dusun2.meta.total).toBe(harapan('dsn_ss_2').length)
    expect(skemaDaftar.parse(await (await daftar('?dusun=9')).json()).meta.total).toBe(0)
  })

  it('filter tidak valid → 422, tanpa login → 401', async () => {
    const r = await daftar('?pageSize=7')
    expect(r.status).toBe(422)
    expect(galatSchema.parse(await r.json()).error.code).toBe('VALIDATION')
    expect((await daftar('', null)).status).toBe(401)
  })

  it('Kaur Keuangan tidak berhak (403 dengan pesan tiruan)', async () => {
    const r = await daftar('', kukiKaur)
    expect(r.status).toBe(403)
    expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'FORBIDDEN', message: PESAN_TIDAK_BERHAK })
  })

  it('Kepala Dusun II hanya melihat KK dusunnya (fokus 4)', async () => {
    const isi = skemaDaftar.parse(await (await daftar('?pageSize=100', kukiKadus)).json())
    const h = harapan('dsn_ss_2')
    expect(isi.meta.total).toBe(h.length)
    expect(h.length).toBeGreaterThan(0)
    expect(isi.data.every((k) => k.dusunId === 'dsn_ss_2')).toBe(true)
  })

  it('desa lain tidak terlihat: operator Tanjung Lamo mendapat daftar kosong', async () => {
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.8.0.4')).kuki
    expect(skemaDaftar.parse(await (await daftar('', yusri, TL)).json()).meta.total).toBe(0)
  })
})

describe('POST /keluarga/cari', () => {
  it('nomor KK utuh menemukan satu KK, potongan nomor KK dan nama kepala juga', async () => {
    const satu = skemaDaftar.parse(await (await cari({ kata: KK_SYAHRIAL, filter: {} })).json())
    expect(satu.data).toHaveLength(1)
    expect(satu.data[0]).toMatchObject({ id: 'kk_syahrial', namaKepala: 'Syahrial', jumlahAnggota: 4, nomorKk: KK_SYAHRIAL })
    const potongan = skemaDaftar.parse(await (await cari({ kata: '2011 2380', filter: {} })).json())
    expect(potongan.data.map((k) => k.id)).toContain('kk_syahrial')
    const nama = skemaDaftar.parse(await (await cari({ kata: 'syahrial', filter: {} })).json())
    expect(nama.data.map((k) => k.id)).toContain('kk_syahrial')
  })

  it('kata terlalu pendek tidak mencocokkan apa pun, filter dusun tetap berlaku', async () => {
    expect(skemaDaftar.parse(await (await cari({ kata: 'a', filter: {} })).json()).meta.total).toBe(0)
    expect(skemaDaftar.parse(await (await cari({ kata: '123', filter: {} })).json()).meta.total).toBe(0)
    const semua = skemaDaftar.parse(await (await cari({ kata: 'syahrial', filter: {} })).json()).meta.total
    const dusunLain = skemaDaftar.parse(await (await cari({ kata: 'syahrial', filter: { dusun: 4 } })).json()).meta.total
    expect(dusunLain).toBeLessThanOrEqual(semua)
  })

  it('isian tidak valid → 422; Kaur Keuangan 403; Kepala Dusun tidak menemukan NIK atau KK dusun lain', async () => {
    expect((await cari({ kata: '', filter: {} })).status).toBe(422)
    expect((await cari({ kata: 'syahrial', filter: {} }, kukiKaur)).status).toBe(403)
    expect(skemaDaftar.parse(await (await cari({ kata: NIK_SITI, filter: {} }, kukiKadus)).json()).meta.total).toBe(0)
    expect(skemaDaftar.parse(await (await cari({ kata: KK_SYAHRIAL, filter: {} }, kukiKadus)).json()).meta.total).toBe(0)
  })
})

describe('GET /keluarga/:id', () => {
  it('detail: anggota urut sesuai KK, setiap anggota sama dengan dunia demo', async () => {
    const r = await detail('kk_syahrial')
    expect(r.status).toBe(200)
    const isi = detailKeluargaSchema.parse(await r.json())
    expect(isi.anggota.map((a) => a.nama)).toEqual(['Syahrial', 'Siti Rahmah', 'Nur Aini', 'Muhammad Alif'])
    const kk = dunia.keluarga.find((k) => k.id === 'kk_syahrial')
    expect(isi.keluarga).toEqual(kk)
    expect(isi.anggota).toEqual(kk?.anggotaIds.map((id) => dunia.penduduk.find((p) => p.id === id)))
  })

  it('id tak dikenal → 404 dengan pesan tiruan; Kaur Keuangan 403; tanpa login 401', async () => {
    const r = await detail('kk_tidak_ada')
    expect(r.status).toBe(404)
    expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'NOT_FOUND', message: 'Data keluarga tidak ditemukan.' })
    expect((await detail('kk_syahrial', kukiKaur)).status).toBe(403)
    expect((await detail('kk_syahrial', null)).status).toBe(401)
  })

  it('KK dusun lain 404 bagi Kepala Dusun, dan KK desa lain 404 bagi operator desa lain (fokus 4)', async () => {
    expect((await detail('kk_syahrial', kukiKadus)).status).toBe(404)
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.8.0.5')).kuki
    expect((await detail('kk_syahrial', yusri, TL)).status).toBe(404)
  })

  it('KK tanpa anggota Hidup hilang dari daftar dan hitungan KK, tetapi detail dan nomor KK-nya tetap terbaca (fokus 3)', async () => {
    const anggota = (await uji.sqlMigrasi`select id from penduduk where keluarga_id = 'kk_syahrial'`).map((b) => b.id as string)
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Pindah' where keluarga_id = 'kk_syahrial'`
    try {
      const isi = skemaDaftar.parse(await (await daftar('?pageSize=100&page=9')).json())
      expect(isi.meta.total).toBe(805)
      expect(skemaDaftar.parse(await (await cari({ kata: KK_SYAHRIAL, filter: {} })).json()).meta.total).toBe(0)
      const d = detailKeluargaSchema.parse(await (await detail('kk_syahrial')).json())
      expect(d.anggota).toEqual([])
      expect(d.keluarga).toMatchObject({ id: 'kk_syahrial', nomorKk: KK_SYAHRIAL, anggotaIds: [] })
      expect(ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kukiOperator)).json()).kk).toBe(805)
    } finally {
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = any(${anggota})`
    }
    expect(skemaDaftar.parse(await (await daftar('')).json()).meta.total).toBe(806)
  })
})
