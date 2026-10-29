import { bangkitkanDb } from '@sinfodes/demo/generator'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilCariSchema, type HasilCari } from '@sinfodes/kontrak/cari/schema'
import { cocokNama, cocokPenduduk } from '@sinfodes/kontrak/penduduk/cari'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const KOSONG: HasilCari = { penduduk: [], keluarga: [], surat: [] }

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<'operator' | 'kaur' | 'kadus', string> = { operator: '', kaur: '', kadus: '' }
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  const masuk = async (surel: string, ip: string) => (await masukLewatRute(app, SS, `${surel}@sungaisialang.desa.id`, 'demo', ip)).kuki as string
  kuki.operator = await masuk('rosmiati', '10.10.0.1')
  kuki.kaur = await masuk('nurhayati', '10.10.0.2')
  kuki.kadus = await masuk('sukardi', '10.10.0.3')
})
afterAll(async () => {
  await uji?.tutup()
})

const kirim = (badan: unknown, k: string | null = kuki.operator) => kirimJson(app, SS, '/api/v1/cari', badan, k)
async function cari(kata: string, k: string | null = kuki.operator): Promise<HasilCari> {
  const r = await kirim({ kata }, k)
  expect(r.status, `kata "${kata}"`).toBe(200)
  return hasilCariSchema.parse(await r.json())
}

const pendudukDesa = () => dunia.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG)
const nomorKkDemo = () => new Map(dunia.keluarga.map((k) => [k.id, k.nomorKk]))

describe('POST /cari (SPEC-V0.2 §5.4)', () => {
  it('NIK lengkap → tepat satu penduduk', async () => {
    expect((await cari('1405095203918002')).penduduk.map((p) => p.nama)).toEqual(['Siti Rahmah'])
  })

  it('nama: paling banyak 5 per jenis, urut nama, semuanya cocok dan sama dengan perhitungan dunia demo', async () => {
    const h = await cari('siti')
    expect(h.penduduk.length).toBeGreaterThan(0)
    expect(h.penduduk.length).toBeLessThanOrEqual(5)
    expect(h.penduduk.every((p) => p.nama.toLowerCase().includes('siti'))).toBe(true)
    const nomor = nomorKkDemo()
    const harapan = pendudukDesa()
      .filter((p) => cocokPenduduk(p, 'siti', nomor.get(p.keluargaId) ?? ''))
      .map((p) => p.nama)
      .sort((a, b) => a.localeCompare(b, 'id'))
      .slice(0, 5)
    expect(h.penduduk.map((p) => p.nama)).toEqual(harapan)
    expect(h.keluarga.length).toBeLessThanOrEqual(5)
  })

  it('nomor KK → keluarga dan seluruh anggotanya', async () => {
    const h = await cari('1405092011238004')
    expect(h.keluarga.map((k) => k.id)).toEqual(['kk_syahrial'])
    expect(h.penduduk).toHaveLength(4)
    expect(h.keluarga[0]).toMatchObject({ nomorKk: '1405092011238004' })
  })

  it('kata terlalu pendek, hanya spasi, atau tidak cocok → tiga larik kosong', async () => {
    for (const kata of ['s', ' ', '   ', '123', 'zzzzzzzz']) expect(await cari(kata), kata).toEqual(KOSONG)
  })

  it('Kaur Keuangan tidak berhak melihat penduduk → kosong dengan status 200', async () => {
    expect(await cari('1405095203918002', kuki.kaur)).toEqual(KOSONG)
    expect(await cari('siti', kuki.kaur)).toEqual(KOSONG)
  })

  it('Kepala Dusun II tidak menemukan warga dusun lain, tetapi menemukan warga dusunnya (fokus review 1)', async () => {
    expect((await cari('1405095203918002', kuki.kadus)).penduduk).toEqual([])
    const warga = pendudukDesa().find((p) => p.dusunId === 'dsn_ss_2' && p.statusDasar === 'Hidup' && p.nik !== null)
    expect(warga).toBeDefined()
    expect((await cari(warga?.nik as string, kuki.kadus)).penduduk.map((p) => p.id)).toContain(warga?.id)
    const keluargaWarga = (await cari(nomorKkDemo().get(warga?.keluargaId as string) as string, kuki.kadus)).keluarga
    expect(keluargaWarga.length).toBeGreaterThan(0)
    expect(keluargaWarga.every((k) => k.dusunId === 'dsn_ss_2')).toBe(true)
  })

  it('penduduk yang sudah meninggal atau pindah tetap tampil dengan statusDasar-nya', async () => {
    for (const status of ['Meninggal', 'Pindah'] as const) {
      const orang = pendudukDesa().find((p) => p.statusDasar === status && p.nik !== null)
      expect(orang, status).toBeDefined()
      const h = await cari(orang?.nik as string)
      expect(h.penduduk.find((p) => p.id === orang?.id), status).toMatchObject({ statusDasar: status })
    }
  })

  it('kata aneh tetap aman: karakter pola SQL dan kutip hanya dicocokkan sebagai teks; 100 karakter diterima', async () => {
    for (const kata of ['%%', '__', "'; drop table penduduk;--", '\\\\', 'a'.repeat(100)]) expect(await cari(kata), kata).toEqual(KOSONG)
    expect(pendudukDesa().length).toBeGreaterThan(2000)
  })

  it('kata 101 karakter, badan bukan JSON, dan tanpa kata → 422; tanpa sesi → 401', async () => {
    for (const badan of [{ kata: 'a'.repeat(101) }, {}, { kata: 5 }, null]) {
      const r = await kirim(badan)
      expect(r.status).toBe(422)
      expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'VALIDATION', message: 'Kata pencarian tidak valid.' })
    }
    expect((await kirim({ kata: 'siti' }, null)).status).toBe(401)
  })

})

describe('POST /cari: surat (rencana 8F2a Tugas 5)', () => {
  const suratDunia = () => dunia.permohonan.filter((p) => p.desaId === ID_SUNGAI_SIALANG)
  const namaPemohon = (id: string) => dunia.penduduk.find((p) => p.id === id)?.nama ?? ''
  const harapanNama = (daftar: typeof dunia.permohonan, kata: string) =>
    daftar
      .filter((p) => cocokNama(namaPemohon(p.pemohonId), kata))
      .sort((a, b) => b.masukPada.localeCompare(a.masukPada) || (a.id < b.id ? -1 : 1))
      .slice(0, 5)
  const ringkas = (p: (typeof dunia.permohonan)[number]) => {
    const jenis = dunia.jenisSurat.find((j) => j.id === p.jenisId)
    return { id: p.id, kode: jenis?.kode, jenisNama: jenis?.nama, pemohon: namaPemohon(p.pemohonId), nomor: p.terbit?.nomor ?? null, status: p.status }
  }

  it('nama pemohon → permohonannya: paling banyak lima, terbaru dulu, semua status', async () => {
    const harapan = harapanNama(suratDunia(), 'siti')
    expect(harapan.length).toBe(5)
    expect((await cari('siti')).surat).toEqual(harapan.map(ringkas))
  })

  it('nomor surat (bergaris miring) → surat itu, huruf besar dan kecil sama', async () => {
    const p = suratDunia().find((x) => x.terbit) as (typeof dunia.permohonan)[number]
    const nomor = p.terbit?.nomor as string
    const harapan = suratDunia()
      .filter((x) => x.terbit?.nomor.includes(nomor.toUpperCase()))
      .sort((a, b) => b.masukPada.localeCompare(a.masukPada) || (a.id < b.id ? -1 : 1))
      .slice(0, 5)
    expect(harapan.map((x) => x.id)).toContain(p.id)
    expect((await cari(nomor)).surat).toEqual(harapan.map(ringkas))
    expect((await cari(nomor.toLowerCase())).surat.map((s) => s.id)).toEqual(harapan.map((x) => x.id))
    expect((await cari('9999/ZZZ/XX')).surat).toEqual([])
  })

  it('Kepala Dusun hanya mendapat surat dari dusunnya (fokus review 5)', async () => {
    const dusun = dunia.pengguna.find((u) => u.email === 'sukardi@sungaisialang.desa.id')?.dusunId
    const semua = suratDunia()
    const dalam = semua.filter((p) => p.dusunId === dusun)
    const luar = semua.find((p) => p.dusunId !== dusun && p.terbit) as (typeof dunia.permohonan)[number]
    expect(dalam.length).toBeGreaterThan(0)
    expect((await cari(luar.terbit?.nomor as string, kuki.kadus)).surat).toEqual([])
    expect((await cari(luar.terbit?.nomor as string)).surat.map((s) => s.id)).toContain(luar.id)
    const nama = namaPemohon(dalam[0].pemohonId)
    const hasil = (await cari(nama, kuki.kadus)).surat
    expect(hasil.map((s) => s.id)).toEqual(harapanNama(dalam, nama).map((p) => p.id))
    expect(hasil.every((s) => dalam.some((p) => p.id === s.id))).toBe(true)
  })

  it('peran tanpa hak melihat penduduk mendapat tiga larik kosong, bukan galat', async () => {
    expect(await cari('siti', kuki.kaur)).toEqual(KOSONG)
  })
})
