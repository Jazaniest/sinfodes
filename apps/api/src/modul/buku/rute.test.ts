import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { DAFTAR_BUKU, isiBukuSchema, ringkasBukuSchema, UKURAN_SEMUA_BARIS } from '@sinfodes/kontrak/buku/schema'
import { KODE_BUKU_PENDUDUK, susunBukuPenduduk, type BahanBukuPenduduk } from '@sinfodes/kontrak/buku/penduduk'
import type { BarisPenduduk } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import { BUKU_MENUNGGU } from './susunan'

const SS = 'http://sungaisialang.sinfodes.localhost'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<'operator' | 'kades' | 'kaur' | 'kadus', string> = { operator: '', kades: '', kaur: '', kadus: '' }
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  const masuk = async (surel: string, ip: string) => (await masukLewatRute(app, SS, `${surel}@sungaisialang.desa.id`, 'demo', ip)).kuki as string
  kuki.operator = await masuk('rosmiati', '10.9.0.1')
  kuki.kades = await masuk('kades', '10.9.0.2')
  kuki.kaur = await masuk('nurhayati', '10.9.0.3')
  kuki.kadus = await masuk('sukardi', '10.9.0.4')
})
afterAll(async () => {
  await uji?.tutup()
})

const daftar = (k: string | null = kuki.operator) => ambil(app, `${SS}/api/v1/buku-administrasi`, k)
const isi = (kode: string, query = '', k: string | null = kuki.operator) => ambil(app, `${SS}/api/v1/buku-administrasi/${kode}${query}`, k)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error

/** Bahan buku dari dunia demo, seperti penghubung tiruan, untuk membandingkan isi buku dari server. */
function bahanDemo(): BahanBukuPenduduk {
  const desa = dunia.desa.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!desa) throw new Error('desa demo tidak ada')
  const nomorKk = new Map(dunia.keluarga.map((k) => [k.id, k.nomorKk]))
  const penduduk: BarisPenduduk[] = dunia.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG).map((p) => ({ ...p, nomorKk: nomorKk.get(p.keluargaId) ?? '' }))
  return {
    hariIni: SEKARANG_UJI,
    dusun: dunia.dusun.filter((d) => d.desaId === ID_SUNGAI_SIALANG),
    istilah: desa.istilahWilayah,
    penduduk,
    mutasi: dunia.mutasi.filter((m) => m.desaId === ID_SUNGAI_SIALANG),
    keluarga: dunia.keluarga.filter((k) => k.desaId === ID_SUNGAI_SIALANG).map((k) => ({ dusunId: k.dusunId, jumlahAnggota: k.anggotaIds.length })),
  }
}

describe('GET /buku-administrasi', () => {
  it('Operator melihat 24 buku; lima buku penduduk berjumlah sama dengan dunia demo', async () => {
    const r = await daftar()
    expect(r.status).toBe(200)
    const buku = z.array(ringkasBukuSchema).parse(await r.json())
    expect(buku.map((b) => b.kode)).toEqual(DAFTAR_BUKU.map((b) => b.kode))
    const bahan = bahanDemo()
    for (const kode of KODE_BUKU_PENDUDUK) {
      const harapan = susunBukuPenduduk(kode, bahan)
      expect(buku.find((b) => b.kode === kode), kode).toMatchObject({ jumlah: harapan.baris.length, diperbarui: harapan.diperbarui })
    }
    expect(buku.find((b) => b.kode === 'induk-penduduk')).toMatchObject({ sumber: 'Kependudukan', jumlah: 2812 })
  })

  it('buku manual dan buku yang menunggu sumbernya tanpa jumlah dan tanpa waktu', async () => {
    const buku = z.array(ringkasBukuSchema).parse(await (await daftar()).json())
    expect(buku.find((b) => b.kode === 'kas-umum')).toMatchObject({ sumber: null, jumlah: null, diperbarui: null })
    for (const kode of Object.keys(BUKU_MENUNGGU)) expect(buku.find((b) => b.kode === kode), kode).toMatchObject({ jumlah: null, diperbarui: null })
  })

  it('Kaur Keuangan hanya enam buku keuangan; Kepala Dusun 403; tanpa sesi 401', async () => {
    const buku = z.array(ringkasBukuSchema).parse(await (await daftar(kuki.kaur)).json())
    expect(buku.map((b) => b.kode)).toEqual(['apb-desa', 'rab', 'kas-pembantu-kegiatan', 'kas-umum', 'kas-pembantu', 'bank-desa'])
    const kadus = await daftar(kuki.kadus)
    expect(kadus.status).toBe(403)
    expect(await galat(kadus)).toMatchObject({ code: 'FORBIDDEN', message: 'Peran Anda tidak berhak membuka Buku Administrasi.' })
    expect((await daftar(null)).status).toBe(401)
  })
})

describe('GET /buku-administrasi/:kode', () => {
  it('isi lima buku penduduk sama dengan susunan kontrak pada dunia demo (nomor KK dan NIK terbuka dari sandi)', async () => {
    const bahan = bahanDemo()
    for (const kode of KODE_BUKU_PENDUDUK) {
      const r = await isi(kode, `?pageSize=${UKURAN_SEMUA_BARIS}`)
      expect(r.status, kode).toBe(200)
      const hasil = isiBukuSchema.parse(await r.json())
      const harapan = susunBukuPenduduk(kode, bahan)
      expect(hasil.kolom, kode).toEqual([...harapan.kolom])
      expect(hasil.meta, kode).toEqual({ page: 1, pageSize: UKURAN_SEMUA_BARIS, total: harapan.baris.length })
      // Baris kembar pada semua kunci urut boleh tertukar (urutan pembangkitan data demo berbeda dengan urutan ID server).
      // Rekapitulasi tidak bernomor (kolom pertamanya wilayah); buku lain bernomor urut mulai 1.
      const bernomor = hasil.kolom[0] === 'No'
      const tanpaNomor = (b: string[][]) => b.map((x) => JSON.stringify(bernomor ? x.slice(1) : x)).sort()
      expect(tanpaNomor(hasil.baris), kode).toEqual(tanpaNomor(harapan.baris))
      if (bernomor) expect(hasil.baris.map((b) => b[0]), kode).toEqual(hasil.baris.map((_, i) => String(i + 1)))
    }
  })

  it('Buku Induk berisi NIK dan nomor KK utuh untuk Kepala Desa; halaman 2 berukuran 25 bernomor 26', async () => {
    const r = await isi('induk-penduduk', '?page=2&pageSize=25', kuki.kades)
    const hasil = isiBukuSchema.parse(await r.json())
    expect(hasil.meta).toEqual({ page: 2, pageSize: 25, total: 2812 })
    expect(hasil.baris).toHaveLength(25)
    expect(hasil.baris[0][0]).toBe('26')
    expect(hasil.baris.every((b) => /^\d{16}$/.test(b[13]) || b[13] === '')).toBe(true)
    expect(hasil.baris.every((b) => /^\d{16}$/.test(b[14]))).toBe(true)
  })

  it('halaman melewati akhir berisi baris kosong; page=0 dan pageSize=5001 → 422', async () => {
    const lewat = isiBukuSchema.parse(await (await isi('induk-penduduk', '?page=9999&pageSize=25')).json())
    expect(lewat.baris).toEqual([])
    expect(lewat.meta.total).toBe(2812)
    for (const query of ['?page=0', '?pageSize=5001', '?pageSize=0', '?page=abc']) {
      const r = await isi('induk-penduduk', query)
      expect(r.status, query).toBe(422)
      expect((await galat(r)).code).toBe('VALIDATION')
    }
  })

  it('kode tak dikenal, buku manual, dan buku yang menunggu sumbernya → 404 dengan pesan masing-masing', async () => {
    const tak = await isi('tidak-ada')
    expect(tak.status).toBe(404)
    expect((await galat(tak)).message).toBe('Buku tidak ditemukan.')
    const manual = await isi('kas-umum', '', kuki.operator)
    expect(manual.status).toBe(404)
    expect((await galat(manual)).message).toBe('Buku ini diisi manual dan belum tersedia di Sinfodes.')
    for (const kode of Object.keys(BUKU_MENUNGGU)) {
      const r = await isi(kode)
      expect(r.status, kode).toBe(404)
      expect((await galat(r)).message, kode).toBe('Sumber data buku ini belum tersedia di Sinfodes.')
    }
  })

  it('Kaur Keuangan ke buku penduduk 403; Kepala Dusun 403; tanpa sesi 401; buku keuangan manual tetap 404 bagi Kaur', async () => {
    for (const k of [kuki.kaur, kuki.kadus]) {
      const r = await isi('induk-penduduk', '', k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe('Peran Anda tidak berhak membuka buku ini.')
    }
    expect((await isi('induk-penduduk', '', null)).status).toBe(401)
    expect((await isi('kas-umum', '', kuki.kaur)).status).toBe(404)
  })

  it('Buku Mutasi memuat satu baris per orang per kejadian', async () => {
    const hasil = isiBukuSchema.parse(await (await isi('mutasi-penduduk', `?pageSize=${UKURAN_SEMUA_BARIS}`)).json())
    const harapan = dunia.mutasi.filter((m) => m.desaId === ID_SUNGAI_SIALANG).reduce((t, m) => t + m.pendudukIds.length, 0)
    expect(hasil.meta.total).toBe(harapan)
    expect(hasil.baris).toHaveLength(harapan)
  })
})
