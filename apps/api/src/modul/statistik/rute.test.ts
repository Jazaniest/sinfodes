import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { hitungStatistik, statistikPendudukSchema } from '@sinfodes/kontrak/statistik/penduduk'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DUSUN_KADUS = 'dsn_ss_2'

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

const statistik = (query: string, kuki: string | null = kukiOperator, basis = SS, aplikasi = app) =>
  ambil(aplikasi, `${basis}/api/v1/statistik/penduduk${query}`, kuki)

/** Statistik yang diharapkan, dihitung dari dunia demo dengan fungsi kontrak yang sama dengan handler tiruan. */
function harapan(nomorDusun: number | null, hariIni: Date = SEKARANG_UJI) {
  const desa = dunia.desa.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!desa) throw new Error('desa demo tidak ada')
  const dusun = dunia.dusun.filter((d) => d.desaId === ID_SUNGAI_SIALANG)
  const terpilih = nomorDusun === null ? undefined : dusun.find((d) => d.nomor === nomorDusun)
  const semua = dunia.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG && (terpilih === undefined || p.dusunId === terpilih.id))
  const kk = new Set(semua.filter((p) => p.statusDasar === 'Hidup').map((p) => p.keluargaId)).size
  return hitungStatistik(semua, { hariIni, dusun, istilah: desa.istilahWilayah, dusunTerpilih: nomorDusun, kk })
}

describe('GET /statistik/penduduk (SPEC-V0.2 §6.7)', () => {
  it('seluruh desa: angka sama dengan dunia demo; piramida, per dusun, dan tiap grafik menjumlah ke total', async () => {
    const r = await statistik('')
    expect(r.status).toBe(200)
    const isi = statistikPendudukSchema.parse(await r.json())
    expect(isi).toEqual(harapan(null))
    expect(isi.jiwa).toBeGreaterThan(2000)
    const jumlah = (larik: readonly { jumlah: number }[]) => larik.reduce((t, b) => t + b.jumlah, 0)
    expect(isi.laki + isi.perempuan).toBe(isi.jiwa)
    expect(jumlah(isi.perDusun)).toBe(isi.jiwa)
    expect(isi.piramida.reduce((t, k) => t + k.laki + k.perempuan, 0)).toBe(isi.jiwa)
    for (const grafik of [isi.agama, isi.pendidikan, isi.perkawinan, isi.ktpEl, isi.pekerjaan]) expect(jumlah(grafik)).toBe(isi.jiwa)
  })

  it('sama dengan ringkasan penduduk: jiwa dan KK', async () => {
    const ringkas = (await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kukiOperator)).json()) as { jiwa: number; kk: number }
    const isi = statistikPendudukSchema.parse(await (await statistik('')).json())
    expect({ jiwa: isi.jiwa, kk: isi.kk }).toEqual({ jiwa: ringkas.jiwa, kk: ringkas.kk })
  })

  it('satu dusun: jiwa sama dengan daftar penduduk dusun itu; tanpa grafik per dusun', async () => {
    const isi = statistikPendudukSchema.parse(await (await statistik('?dusun=3')).json())
    expect(isi).toEqual(harapan(3))
    expect(isi.dusun).toBe(3)
    expect(isi.perDusun).toEqual([])
    const daftar = (await (await ambil(app, `${SS}/api/v1/penduduk?dusun=3&status=Hidup&pageSize=25`, kukiOperator)).json()) as { meta: { total: number } }
    expect(isi.jiwa).toBe(daftar.meta.total)
  })

  it('Kepala Dusun II selalu mendapat dusunnya, walau meminta dusun lain (fokus review 1)', async () => {
    const dusunnya = dunia.dusun.find((d) => d.id === DUSUN_KADUS)?.nomor
    expect(dusunnya).toBe(2)
    for (const query of ['', '?dusun=1', '?dusun=99', '?dusun=abc']) {
      const r = await statistik(query, kukiKadus)
      expect(r.status, query).toBe(200)
      expect(statistikPendudukSchema.parse(await r.json()), query).toEqual(harapan(2))
    }
  })

  it('dusun tidak dikenal 422; bukan angka diabaikan; Kaur Keuangan 403; tanpa sesi 401', async () => {
    const r = await statistik('?dusun=99')
    expect(r.status).toBe(422)
    expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'VALIDATION', message: 'Dusun tidak dikenal.' })

    expect(statistikPendudukSchema.parse(await (await statistik('?dusun=abc')).json())).toEqual(harapan(null))

    const kaur = await statistik('', kukiKaur)
    expect(kaur.status).toBe(403)
    expect(galatSchema.parse(await kaur.json()).error).toMatchObject({ code: 'FORBIDDEN', message: 'Peran Anda tidak berhak melihat statistik penduduk.' })

    expect((await statistik('', null)).status).toBe(401)
  })

  it('umur dihitung menurut hari ini WIB: 31 Desember 17.30 UTC sudah 1 Januari 2027 (fokus 7)', async () => {
    const batas = new Date('2026-12-31T17:30:00Z')
    const { app: appBatas } = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => batas })
    const kuki = (await masukLewatRute(appBatas, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.8.0.4')).kuki as string
    const isi = statistikPendudukSchema.parse(await (await statistik('', kuki, SS, appBatas)).json())
    expect(isi).toEqual(harapan(null, batas))
  })
})

describe('GET /statistik/penduduk: keadaan data (fokus 7)', () => {
  it('penduduk yang meninggal tidak dihitung, dan KK tanpa anggota Hidup tidak dihitung', async () => {
    const sebelum = statistikPendudukSchema.parse(await (await statistik('')).json())
    const hidup = dunia.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Hidup')
    const perKk = new Map<string, typeof hidup>()
    for (const p of hidup) perKk.set(p.keluargaId, [...(perKk.get(p.keluargaId) ?? []), p])
    const sendirian = [...perKk.values()].find((a) => a.length === 1)?.[0]
    const berdua = [...perKk.values()].find((a) => a.length >= 2)?.[0]
    expect(sendirian).toBeDefined()
    expect(berdua).toBeDefined()
    const sql = uji.sqlMigrasi
    try {
      await sql`update penduduk set status_dasar = 'Meninggal' where id = ${berdua?.id as string}`
      const satu = statistikPendudukSchema.parse(await (await statistik('')).json())
      expect(satu.jiwa).toBe(sebelum.jiwa - 1)
      expect(satu.kk).toBe(sebelum.kk)
      await sql`update penduduk set status_dasar = 'Pindah' where id = ${sendirian?.id as string}`
      const dua = statistikPendudukSchema.parse(await (await statistik('')).json())
      expect(dua.jiwa).toBe(sebelum.jiwa - 2)
      expect(dua.kk).toBe(sebelum.kk - 1)
    } finally {
      await sql`update penduduk set status_dasar = 'Hidup' where id in (${berdua?.id as string}, ${sendirian?.id as string})`
    }
    expect(statistikPendudukSchema.parse(await (await statistik('')).json())).toEqual(sebelum)
  })

  it('dusun tanpa penduduk Hidup menjawab nol di semua larik tanpa galat', async () => {
    const sql = uji.sqlMigrasi
    const [{ nomor }] = await sql<{ nomor: number }[]>`select coalesce(max(nomor), 0) + 1 as nomor from dusun where desa_id = ${ID_SUNGAI_SIALANG}`
    const id = `dsn_uji_kosong_${nomor}`
    const rw = JSON.stringify([{ nomor: '001', ketua: '-', rt: [{ nomor: '001', ketua: '-' }] }])
    await sql`insert into dusun (id, desa_id, nomor, nama, kepala_dusun, posyandu, rw) values (${id}, ${ID_SUNGAI_SIALANG}, ${nomor}, 'Kosong', '-', '-', ${rw}::jsonb)`
    try {
      const r = await statistik(`?dusun=${nomor}`)
      expect(r.status).toBe(200)
      const isi = statistikPendudukSchema.parse(await r.json())
      expect(isi).toMatchObject({ dusun: nomor, jiwa: 0, laki: 0, perempuan: 0, kk: 0, perDusun: [], agama: [], pendidikan: [], pekerjaan: [], perkawinan: [], ktpEl: [] })
      expect(isi.piramida.every((k) => k.laki === 0 && k.perempuan === 0)).toBe(true)
    } finally {
      await sql`delete from dusun where id = ${id}`
    }
  })
})
