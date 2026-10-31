import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { DAFTAR_BUKU, isiBukuSchema, ringkasBukuSchema, UKURAN_SEMUA_BARIS } from '@sinfodes/kontrak/buku/schema'
import { susunBukuAgenda, type BahanBukuAgenda } from '@sinfodes/kontrak/buku/agenda'
import { KODE_BUKU_PENDUDUK, susunBukuPenduduk, type BahanBukuPenduduk } from '@sinfodes/kontrak/buku/penduduk'
import type { BarisPenduduk } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
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

/** Bahan Buku Agenda dari dunia demo, seperti penghubung tiruan: pembanding independen untuk isi buku dari server. */
function bahanAgendaDemo(): BahanBukuAgenda {
  const nama = new Map(dunia.penduduk.map((p) => [p.id, p.nama]))
  const jenis = new Map(dunia.jenisSurat.map((j) => [j.id, j.nama]))
  return {
    keluar: dunia.permohonan.flatMap((p) =>
      p.desaId === ID_SUNGAI_SIALANG && p.terbit
        ? [{ terbitPada: p.terbit.pada, nomor: p.terbit.nomor, pemohon: nama.get(p.pemohonId) ?? '', jenis: jenis.get(p.jenisId) ?? '' }]
        : [],
    ),
    masuk: dunia.suratMasuk
      .filter((s) => s.desaId === ID_SUNGAI_SIALANG)
      .map((s) => ({ diterima: s.diterima, dicatatPada: s.dicatat.pada, nomor: s.nomor, tanggalSurat: s.tanggalSurat, pengirim: s.pengirim, perihal: s.perihal })),
  }
}

describe('Buku Agenda dari server (rencana 8F3 Ruling 16)', () => {
  it('daftar buku memuat jumlah dan waktu pembaruan Agenda, sama dengan susunan atas bahan demo', async () => {
    const harapan = susunBukuAgenda(bahanAgendaDemo())
    expect(harapan.baris.length).toBeGreaterThan(100)
    const buku = z.array(ringkasBukuSchema).parse(await (await daftar()).json())
    expect(buku.find((b) => b.kode === 'agenda')).toMatchObject({ sumber: 'Layanan Surat (surat keluar dan masuk)', jumlah: harapan.baris.length, diperbarui: harapan.diperbarui })
  })

  it('isi Agenda: kolom dan semua baris sama dengan susunan atas surat terbit (termasuk Dibatalkan) dan seluruh surat masuk desa', async () => {
    const harapan = susunBukuAgenda(bahanAgendaDemo())
    const r = await isi('agenda', `?pageSize=${UKURAN_SEMUA_BARIS}`)
    expect(r.status).toBe(200)
    const hasil = isiBukuSchema.parse(await r.json())
    expect(hasil.kolom).toEqual([...harapan.kolom])
    expect(hasil.baris).toEqual(harapan.baris)
    expect(hasil.meta.total).toBe(harapan.baris.length)
    expect(hasil.buku).toMatchObject({ kode: 'agenda', jumlah: harapan.baris.length, diperbarui: harapan.diperbarui })
    const dibatalkan = dunia.permohonan.filter((p) => p.desaId === ID_SUNGAI_SIALANG && p.status === 'dibatalkan' && p.terbit)
    expect(dibatalkan.length).toBeGreaterThan(0)
    for (const p of dibatalkan) expect(hasil.baris.some((b) => b[3] === p.terbit?.nomor && b[2] === 'Keluar')).toBe(true)
  })

  it('Kepada/Dari surat keluar = nama pemohon dan Isi singkat = nama jenis; surat masuk memakai pengirim dan perihal', async () => {
    const hasil = isiBukuSchema.parse(await (await isi('agenda', `?pageSize=${UKURAN_SEMUA_BARIS}`)).json())
    const p = dunia.permohonan.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.terbit)!
    const baris = hasil.baris.find((b) => b[2] === 'Keluar' && b[3] === p.terbit?.nomor)!
    expect(baris[5]).toBe(dunia.penduduk.find((x) => x.id === p.pemohonId)?.nama)
    expect(baris[6]).toBe(dunia.jenisSurat.find((j) => j.id === p.jenisId)?.nama)
    const s = dunia.suratMasuk.find((x) => x.desaId === ID_SUNGAI_SIALANG)!
    const masuk = hasil.baris.find((b) => b[2] === 'Masuk' && b[3] === s.nomor && b[5] === s.pengirim)!
    expect(masuk[6]).toBe(s.perihal)
  })

  it('halaman dan jumlah benar; desa lain tidak ikut', async () => {
    await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_uji_lain', 2)
    await uji.sqlMigrasi`insert into surat_masuk (id, desa_id, tahun, no_agenda, diterima, nomor, tanggal_surat, pengirim, perihal, dicatat_oleh, dicatat_pada)
      values ('sm_uji_lain', 'desa_uji_lain', 2026, 1, '2026-09-01', 'LAIN/1', '2026-09-01', 'Pengirim Desa Lain', 'Tidak boleh tampil', '{"id":"u","nama":"Op"}'::jsonb, now())`
    const harapan = susunBukuAgenda(bahanAgendaDemo())
    const dua = isiBukuSchema.parse(await (await isi('agenda', '?page=2&pageSize=25')).json())
    expect(dua.meta).toEqual({ page: 2, pageSize: 25, total: harapan.baris.length })
    expect(dua.baris).toEqual(harapan.baris.slice(25, 50))
    const semua = isiBukuSchema.parse(await (await isi('agenda', `?pageSize=${UKURAN_SEMUA_BARIS}`)).json())
    expect(semua.baris.some((b) => b.includes('Pengirim Desa Lain'))).toBe(false)
  })

  it('hak: Kades boleh membuka; Kaur Keuangan dan Kepala Dusun 403; tanpa sesi 401', async () => {
    expect((await isi('agenda', '', kuki.kades)).status).toBe(200)
    for (const k of [kuki.kaur, kuki.kadus]) {
      const r = await isi('agenda', '', k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe('Peran Anda tidak berhak membuka buku ini.')
    }
    expect((await isi('agenda', '', null)).status).toBe(401)
  })

  it('membuka Agenda tidak membuka satu pun sandi (tidak memuat seluruh penduduk); Buku Induk tetap membukanya', async () => {
    const dasar = await penyandiUji(uji.sqlMigrasi)
    let dibuka = 0
    const hitung = { ...dasar, bukaSandi: (...a: Parameters<typeof dasar.bukaSandi>) => (dibuka++, dasar.bukaSandi(...a)) }
    const { app: aplikasi } = rakitApp({ klien: uji.klien, penyandi: hitung })
    const masuk = (await masukLewatRute(aplikasi, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.9.0.9')).kuki as string
    dibuka = 0
    expect((await ambil(aplikasi, `${SS}/api/v1/buku-administrasi/agenda?pageSize=${UKURAN_SEMUA_BARIS}`, masuk)).status).toBe(200)
    expect(dibuka).toBe(0)
    expect((await ambil(aplikasi, `${SS}/api/v1/buku-administrasi/induk-penduduk?pageSize=25`, masuk)).status).toBe(200)
    expect(dibuka).toBeGreaterThan(1000)
  })
})
