import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { barisMutasiSchema, hitungMutasiBulan, ringkasanMutasiSchema, type BarisMutasi } from '@sinfodes/kontrak/mutasi/buku'
import type { Mutasi } from '@sinfodes/kontrak/mutasi/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data mutasi.'
const DUSUN_KADUS = 'dsn_ss_2'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let kukiOperator: string
let kukiKadus: string
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  kukiOperator = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.7.0.1')).kuki as string
  kukiKadus = (await masukLewatRute(app, SS, 'sukardi@sungaisialang.desa.id', 'demo', '10.7.0.2')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

const skemaDaftar = daftarSchema(barisMutasiSchema)
const daftar = (query: string, kuki: string | null = kukiOperator, basis = SS) => ambil(app, `${basis}/api/v1/mutasi${query}`, kuki)
const ringkasan = (query: string, kuki: string | null = kukiOperator, basis = SS) => ambil(app, `${basis}/api/v1/mutasi/ringkasan${query}`, kuki)

/** Mutasi desa yang terlihat, dihitung dari dunia demo seperti handler tiruan; seri diputus menurut ID (Ruling 12). */
function milik(dusunSaja: string | null = null): Mutasi[] {
  const idDalam = new Set(dunia.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG && (dusunSaja === null || p.dusunId === dusunSaja)).map((p) => p.id))
  return dunia.mutasi.filter((m) => m.desaId === ID_SUNGAI_SIALANG && m.pendudukIds.some((id) => idDalam.has(id)))
}
function harapan(opsi: { jenis?: string; bulan?: string; dusunSaja?: string | null } = {}): BarisMutasi[] {
  const dusunSaja = opsi.dusunSaja ?? null
  const nama = new Map(dunia.penduduk.filter((p) => dusunSaja === null || p.dusunId === dusunSaja).map((p) => [p.id, p.nama] as const))
  return milik(dusunSaja)
    .filter((m) => (opsi.jenis === undefined || m.jenis === opsi.jenis) && (opsi.bulan === undefined || m.tanggal.startsWith(opsi.bulan)))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.dicatatPada.localeCompare(a.dicatatPada) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((m) => ({ mutasi: m, penduduk: m.pendudukIds.flatMap((id) => (nama.has(id) ? [{ id, nama: nama.get(id) as string }] : [])) }))
}

describe('GET /mutasi/ringkasan (SPEC-V0.2 §6.6)', () => {
  it('bulan berjalan menurut WIB: 3 lahir, 1 meninggal, 2 datang, 4 pindah', async () => {
    const r = await ringkasan('')
    expect(r.status).toBe(200)
    const isi = ringkasanMutasiSchema.parse(await r.json())
    expect(isi).toEqual({ bulan: '2026-09', lahir: 3, meninggal: 1, datang: 2, pindah: 4 })
    expect(isi).toEqual({ bulan: '2026-09', ...hitungMutasiBulan(milik(), '2026-09') })
  })

  it('bulan lain mengikuti dunia demo; bulan tak valid 422 Bulan tidak valid.', async () => {
    for (const bulan of ['2026-08', '2025-01', '2024-01']) {
      expect(ringkasanMutasiSchema.parse(await (await ringkasan(`?bulan=${bulan}`)).json())).toEqual({ bulan, ...hitungMutasiBulan(milik(), bulan) })
    }
    for (const rusak of ['2026-13', '2026-9', 'september']) {
      const r = await ringkasan(`?bulan=${rusak}`)
      expect(r.status, rusak).toBe(422)
      expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'VALIDATION', message: 'Bulan tidak valid.' })
    }
  })

  it('batas bulan di zona WIB: 31 Agustus 17.30 UTC sudah September', async () => {
    const { app: appBatas } = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => new Date('2026-08-31T17:30:00Z') })
    const kuki = (await masukLewatRute(appBatas, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.7.0.3')).kuki as string
    const r = await ambil(appBatas, `${SS}/api/v1/mutasi/ringkasan`, kuki)
    expect(ringkasanMutasiSchema.parse(await r.json()).bulan).toBe('2026-09')
  })
})

describe('GET /mutasi', () => {
  it('bawaan: halaman 1 berisi 25 baris terbaru dulu, beserta nama penduduknya', async () => {
    const r = await daftar('')
    expect(r.status).toBe(200)
    const isi = skemaDaftar.parse(await r.json())
    const h = harapan()
    expect(h.length).toBeGreaterThan(100)
    expect(isi.meta).toEqual({ page: 1, pageSize: 25, total: h.length })
    expect(isi.data).toEqual(h.slice(0, 25))
  })

  it('filter jenis dan bulan, halaman kedua berukuran 50', async () => {
    const lahir = skemaDaftar.parse(await (await daftar('?jenis=lahir&bulan=2026-09')).json())
    expect(lahir.meta.total).toBe(3)
    expect(lahir.data).toEqual(harapan({ jenis: 'lahir', bulan: '2026-09' }))
    const halaman = skemaDaftar.parse(await (await daftar('?pageSize=50&page=2')).json())
    expect(halaman.meta).toMatchObject({ page: 2, pageSize: 50 })
    expect(halaman.data).toEqual(harapan().slice(50, 100))
    for (const jenis of ['meninggal', 'pindah', 'datang']) {
      expect(skemaDaftar.parse(await (await daftar(`?jenis=${jenis}`)).json()).meta.total, jenis).toBe(harapan({ jenis }).length)
    }
  })

  it('filter tidak valid: 422 Filter tidak valid.', async () => {
    for (const query of ['?jenis=tidakada', '?pageSize=7', '?page=0', '?bulan=2026-13']) {
      const r = await daftar(query)
      expect(r.status, query).toBe(422)
      expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'VALIDATION', message: 'Filter tidak valid.' })
    }
  })

  it('Kepala Dusun II hanya melihat mutasi yang penduduknya di dusunnya (daftar, ringkasan, nama)', async () => {
    const semua = skemaDaftar.parse(await (await daftar('?pageSize=100', kukiKadus)).json())
    const h = harapan({ dusunSaja: DUSUN_KADUS })
    expect(h.length).toBeGreaterThan(0)
    expect(h.length).toBeLessThan(harapan().length)
    expect(semua.meta.total).toBe(h.length)
    expect(semua.data).toEqual(h.slice(0, 100))
    const dusunIni = new Set(dunia.penduduk.filter((p) => p.dusunId === DUSUN_KADUS).map((p) => p.id))
    for (const baris of semua.data) for (const p of baris.penduduk) expect(dusunIni.has(p.id), p.id).toBe(true)
    const ring = ringkasanMutasiSchema.parse(await (await ringkasan('?bulan=2026-09', kukiKadus)).json())
    expect(ring).toEqual({ bulan: '2026-09', ...hitungMutasiBulan(milik(DUSUN_KADUS), '2026-09') })
  })

  it('desa lain tidak melihat mutasi Sungai Sialang', async () => {
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.7.0.4')).kuki
    expect(skemaDaftar.parse(await (await daftar('', yusri, TL)).json()).meta.total).toBe(0)
    expect(ringkasanMutasiSchema.parse(await (await ringkasan('?bulan=2026-09', yusri, TL)).json())).toEqual({ bulan: '2026-09', lahir: 0, meninggal: 0, pindah: 0, datang: 0 })
  })

  it('tanpa cookie 401; Kaur Keuangan 403 dengan pesan tiruan', async () => {
    const kaur = (await masukLewatRute(app, SS, 'nurhayati@sungaisialang.desa.id', 'demo', '10.7.0.5')).kuki
    for (const f of [daftar, ringkasan]) {
      expect((await f('', null)).status).toBe(401)
      const r = await f('', kaur)
      expect(r.status).toBe(403)
      expect(galatSchema.parse(await r.json()).error.message).toBe(PESAN_TIDAK_BERHAK)
    }
  })
})
