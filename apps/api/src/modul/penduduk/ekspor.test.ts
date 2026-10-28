import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { barisPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const skemaEkspor = z.object({ baris: z.array(barisPendudukSchema) })
const skemaDaftar = daftarSchema(barisPendudukSchema)

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
let kuki: string
beforeAll(async () => {
  uji = await buatDbUji()
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  kuki = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.5.0.1')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

const ekspor = async (badan: unknown, kukiPakai: string | null = kuki): Promise<Response> => kirimJson(app, SS, '/api/v1/penduduk/ekspor', badan, kukiPakai)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const aktivitasEkspor = () => uji.sqlMigrasi`select ringkasan, dusun_id, oleh_id, oleh_nama, rujukan_jenis, rujukan_id from aktivitas where jenis = 'penduduk-ekspor' order by waktu, id`
const auditEkspor = () => uji.sqlMigrasi`select pelaku, desa_id, ringkasan from jejak_audit where jenis = 'penduduk.ekspor' order by waktu, id`

describe('POST /penduduk/ekspor (rencana 8E1 Ruling 9)', () => {
  it('seluruh baris tersaring tanpa halaman, sama dengan daftar; tercatat di aktivitas dan jejak audit tanpa NIK', async () => {
    const r = await ekspor({ kata: null, filter: {}, format: 'csv' })
    expect(r.status).toBe(200)
    const { baris } = skemaEkspor.parse(await r.json())
    expect(baris).toHaveLength(2812)
    const halaman = skemaDaftar.parse(await (await ambil(app, `${SS}/api/v1/penduduk?pageSize=100`, kuki)).json())
    expect(baris.slice(0, 100)).toEqual(halaman.data)
    for (const b of baris.slice(0, 50)) expect(b.nik === null || /^\d{16}$/.test(b.nik)).toBe(true)

    const a = await aktivitasEkspor()
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ ringkasan: 'Data penduduk diunduh (2.812 baris)', dusun_id: null, oleh_id: 'pgn_rosmiati', oleh_nama: 'Rosmiati', rujukan_jenis: null, rujukan_id: null })
    const j = await auditEkspor()
    expect(j).toHaveLength(1)
    expect(j[0]).toMatchObject({ pelaku: 'pgn_rosmiati', desa_id: 'desa_sungai_sialang', ringkasan: { format: 'csv', jumlah: 2812 } })
    expect(JSON.stringify(j[0].ringkasan)).not.toMatch(/\d{9,}/)
  })

  it('cetak Buku Induk memakai ringkasan sendiri; kata dan filter berlaku seperti pencarian', async () => {
    const filter = { dusun: 1 }
    const cari = skemaDaftar.parse(await (await kirimJson(app, SS, '/api/v1/penduduk/cari', { kata: 'siti', filter }, kuki)).json())
    const r = await ekspor({ kata: 'siti', filter, format: 'cetak' })
    const { baris } = skemaEkspor.parse(await r.json())
    expect(baris).toHaveLength(cari.meta.total)
    expect(baris.length).toBeGreaterThan(0)
    expect((await aktivitasEkspor()).map((a) => a.ringkasan)).toContain(`Buku Induk Penduduk dicetak (${baris.length} baris)`)
    expect((await auditEkspor()).map((a) => a.ringkasan)).toContainEqual({ format: 'cetak', jumlah: baris.length })
  })

  it('ekspor preset pendatang tahun ini berisi pendatang 2026 dari tabel mutasi dan tercatat (rencana 8E2 Ruling 10)', async () => {
    const dunia = bangkitkanDb(SEKARANG_UJI)
    const ids = new Set(dunia.mutasi.filter((m) => m.desaId === ID_SUNGAI_SIALANG && m.jenis === 'datang' && m.tanggal.startsWith('2026')).flatMap((m) => m.pendudukIds))
    const sebelum = (await aktivitasEkspor()).length
    const r = await ekspor({ kata: null, filter: { preset: 'pendatang-tahun-ini' }, format: 'csv' })
    expect(r.status).toBe(200)
    const { baris } = skemaEkspor.parse(await r.json())
    expect(ids.size).toBeGreaterThanOrEqual(2)
    expect(baris.map((b) => b.id).sort()).toEqual([...ids].sort())
    expect((await aktivitasEkspor()).length).toBe(sebelum + 1)
    expect(await auditEkspor()).toHaveLength(sebelum + 1)
  })

  it('tidak ada data → 422 tanpa catatan; isian tidak valid → 422', async () => {
    const sebelum = (await aktivitasEkspor()).length
    const kosong = await ekspor({ kata: 'zzzzzzzz', filter: {}, format: 'csv' })
    expect(kosong.status).toBe(422)
    expect((await galat(kosong)).message).toBe('Tidak ada data penduduk untuk diunduh.')
    const tidakValid = await ekspor({ kata: null, filter: {}, format: 'xls' })
    expect(tidakValid.status).toBe(422)
    expect((await galat(tidakValid)).message).toBe('Permintaan unduhan tidak valid.')
    expect((await ekspor('bukan json')).status).toBe(422)
    expect((await aktivitasEkspor()).length).toBe(sebelum)
    expect(await auditEkspor()).toHaveLength(sebelum)
  })

  it('Kaur Keuangan 403, tanpa login 401', async () => {
    const kaur = (await masukLewatRute(app, SS, 'nurhayati@sungaisialang.desa.id', 'demo', '10.5.0.2')).kuki as string
    const r = await ekspor({ kata: null, filter: {}, format: 'csv' }, kaur)
    expect(r.status).toBe(403)
    expect((await galat(r)).message).toBe('Peran Anda tidak berhak melihat data penduduk.')
    expect((await ekspor({ kata: null, filter: {}, format: 'csv' }, null)).status).toBe(401)
  })

  it('Kepala Dusun hanya mengunduh dusunnya dan catatannya membawa dusun itu', async () => {
    const kadus = (await masukLewatRute(app, SS, 'sukardi@sungaisialang.desa.id', 'demo', '10.5.0.3')).kuki as string
    const { baris } = skemaEkspor.parse(await (await ekspor({ kata: null, filter: {}, format: 'csv' }, kadus)).json())
    expect(baris.length).toBeGreaterThan(0)
    expect(baris.length).toBeLessThan(2812)
    expect(baris.every((b) => b.dusunId === 'dsn_ss_2')).toBe(true)
    expect((await aktivitasEkspor()).find((a) => a.oleh_id === 'pgn_sukardi')).toMatchObject({ dusun_id: 'dsn_ss_2', oleh_nama: 'Sukardi' })
  })

  it('gagal tercatat berarti tidak ada data yang keluar: unduhan tertutup bila aktivitas gagal ditulis', async () => {
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_aktivitas3() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_aktivitas3() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal3 before insert on aktivitas for each row execute function uji_gagal_aktivitas3()')
    const audit = (await auditEkspor()).length
    try {
      const r = await ekspor({ kata: null, filter: {}, format: 'csv' })
      expect(r.status).toBe(500)
      expect(JSON.stringify(await r.json())).not.toMatch(/\d{16}/)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal3 on aktivitas')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_aktivitas3()')
    }
    expect((await auditEkspor()).length).toBe(audit)
  })
})
