import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { cocokPenduduk } from '@sinfodes/kontrak/penduduk/cari'
import { jenisDenganPakaiSchema } from '@sinfodes/kontrak/surat/jenis'
import { peranMengizinkan, perluTindakan } from '@sinfodes/kontrak/surat/alur'
import { penomoranSchema } from '@sinfodes/kontrak/pengaturan/penomoran'
import { susunPenomoran } from '@sinfodes/kontrak/surat/penomoran'
import { JENIS_MUTASI_SURAT, saranDariMutasi } from '@sinfodes/kontrak/surat/saran'
import {
  barisPermohonanSchema, detailPermohonanSchema, jumlahPermohonanSchema, saranSuratSchema, STATUS_PERMOHONAN, STATUS_TERBUKA,
  type Permohonan, type StatusPermohonan,
} from '@sinfodes/kontrak/surat/permohonan'
import { awalPeriode } from '@sinfodes/kontrak/surat/waktu'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ruang } from '../../kripto/ruang'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_LIHAT = 'Peran Anda tidak berhak membuka Layanan Surat.'
const PESAN_TTD = 'Peran Anda tidak menandatangani surat.'
const PESAN_TIDAK_ADA = 'Permohonan tidak ditemukan.'
const daftarSchema = z.object({ data: barisPermohonanSchema.array(), meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }) })

const DESA_TL = 'desa_tanjung_lamo'
/** Desa Tanjung Lamo tidak punya penduduk di dunia demo; uji menyisipkan dua permohonan menunggu supaya batas antar desa terbukti. */
const ID_TL = ['srt_uji_tl_1', 'srt_uji_tl_2']

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
const kuki: Record<string, string> = {}
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  const penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const akun: [string, string, string][] = [
    ['operator', SS, 'rosmiati@sungaisialang.desa.id'], ['sekdes', SS, 'hendri@sungaisialang.desa.id'], ['kades', SS, 'kades@sungaisialang.desa.id'],
    ['kaur', SS, 'nurhayati@sungaisialang.desa.id'], ['kadus', SS, 'sukardi@sungaisialang.desa.id'], ['operatorTl', TL, 'operator@tanjunglamo.desa.id'],
  ]
  for (const [i, [nama, basis, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, basis, surel, 'demo', `10.9.0.${i + 1}`)).kuki as string
  const jenisTl = dunia.jenisSurat.find((j) => j.desaId === DESA_TL) as DbDemo['jenisSurat'][number]
  await uji.sqlMigrasi.begin(async (tx) => {
    await tx`insert into dusun (id, desa_id, nomor, nama, kepala_dusun, posyandu, rw) values ('dsn_uji_tl', ${DESA_TL}, 1, 'Dusun Uji', 'Bapak Uji', 'Posyandu Uji', ${tx.json([])})`
    await tx`insert into keluarga (id, desa_id, nomor_kk_sandi, nomor_kk_indeks, kepala_keluarga_id, dusun_id, rw, rt, tanggal_terbit)
      values ('kk_uji_tl', ${DESA_TL}, 'sandi', 'indeks-uji-tl', 'pdk_uji_tl', 'dsn_uji_tl', '001', '001', '2020-01-01')`
    await tx`insert into penduduk (id, desa_id, nik_sandi, nik_indeks, nama, jenis_kelamin, golongan_darah, agama, kewarganegaraan, tempat_lahir, tanggal_lahir,
        keluarga_id, hubungan_keluarga, nama_ayah, nama_ibu, dusun_id, rw, rt, status_dasar, status_penduduk, ktp_el, dibuat_pada, diubah_pada)
      values ('pdk_uji_tl', ${DESA_TL}, ${penyandi.sandikan('1405095203910001', ruang.nik(DESA_TL))}, ${penyandi.indeks('1405095203910001', ruang.nik(DESA_TL))}, 'Warga Tanjung Lamo',
        'L', 'O', 'Islam', 'WNI', 'Uji', '1990-01-01', 'kk_uji_tl', 'Kepala Keluarga', 'Ayah', 'Ibu', 'dsn_uji_tl', '001', '001', 'Hidup', 'Tetap', 'Sudah rekam', now(), now())`
    for (const [i, id] of ID_TL.entries()) {
      await tx`insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
        values (${id}, ${DESA_TL}, 'dsn_uji_tl', 2026, ${i + 1}, ${jenisTl.id}, 'loket', 'pdk_uji_tl', ${penyandi.sandikan('{}', ruang.permohonanIsian(DESA_TL))}, 'menunggu', ${new Date(SEKARANG_UJI.getTime() - (i + 1) * 3600_000)})`
    }
  })
})
afterAll(async () => {
  await uji?.tutup()
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const milik = (desaId: string) => dunia.permohonan.filter((p) => p.desaId === desaId)
const ss = () => milik(ID_SUNGAI_SIALANG)
const dusunKadus = () => dunia.pengguna.find((u) => u.email === 'sukardi@sungaisialang.desa.id')?.dusunId as string
const urutId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const terbuka = (s: StatusPermohonan) => STATUS_TERBUKA.includes(s)
const dalamPeriode = (p: Permohonan, hari: number) => terbuka(p.status) || p.masukPada.slice(0, 10) >= awalPeriode(hari, SEKARANG_UJI)
const urutDaftar = (status: StatusPermohonan) => (a: Permohonan, b: Permohonan) =>
  terbuka(status)
    ? a.masukPada.localeCompare(b.masukPada) || urutId(a.id, b.id)
    : (b.ditutupPada ?? b.masukPada).localeCompare(a.ditutupPada ?? a.masukPada) || urutId(a.id, b.id)
const harapanDaftar = (daftar: Permohonan[], status: StatusPermohonan, hari = 14) =>
  daftar.filter((p) => p.status === status && dalamPeriode(p, hari)).sort(urutDaftar(status))
const jenisKode = (p: Permohonan) => dunia.jenisSurat.find((j) => j.id === p.jenisId)?.kode as string
const hitungBaris = async () =>
  Object.fromEntries(
    await Promise.all(['permohonan', 'riwayat_surat'].map(async (t) => [t, Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${t}`))[0].n)] as const)),
  )

const ambilDaftar = async (peran: string, query = '', basis = SS) => ambil(app, `${basis}/api/v1/permohonan${query}`, kuki[peran])

describe('GET /permohonan (rencana 8F2a Tugas 4)', () => {
  it('tab Menunggu: yang terbuka tidak dibatasi periode, terlama dulu, dengan pemohon (nama dan NIK) dan jenis', async () => {
    const r = await ambilDaftar('operator')
    expect(r.status).toBe(200)
    const badan = daftarSchema.parse(await r.json())
    const harapan = harapanDaftar(ss(), 'menunggu')
    expect(harapan.length).toBe(7)
    expect(badan.data.map((b) => b.id)).toEqual(harapan.map((p) => p.id))
    expect(badan.meta).toEqual({ page: 1, pageSize: 25, total: 7 })
    for (const [i, b] of badan.data.entries()) {
      const p = harapan[i]
      const orang = dunia.penduduk.find((x) => x.id === p.pemohonId)
      const jenis = dunia.jenisSurat.find((j) => j.id === p.jenisId)
      expect(b, p.id).toEqual({
        id: p.id, noUrut: p.noUrut, status: 'menunggu', tahap: null, dikembalikan: false, kanal: p.kanal, masukPada: p.masukPada, ditutupPada: null,
        jenis: { id: jenis?.id, kode: jenis?.kode, nama: jenis?.nama }, pemohon: { id: p.pemohonId, nama: orang?.nama, nik: orang?.nik ?? null }, nomor: null,
      })
    }
  })

  it('tab Selesai: dibatasi periode 14 hari, terbaru ditutup dulu, dengan nomor surat', async () => {
    const badan = daftarSchema.parse(await (await ambilDaftar('operator', '?status=selesai')).json())
    const harapan = harapanDaftar(ss(), 'selesai')
    expect(harapan.length).toBeGreaterThan(0)
    expect(badan.data.map((b) => b.id)).toEqual(harapan.slice(0, 25).map((p) => p.id))
    expect(badan.meta.total).toBe(harapan.length)
    for (const [i, b] of badan.data.entries()) {
      expect(b.nomor, b.id).toBe(harapan[i].terbit?.nomor)
      expect(b.ditutupPada, b.id).toBe(harapan[i].ditutupPada)
    }
    const lama = daftarSchema.parse(await (await ambilDaftar('operator', '?status=selesai&periode=365&pageSize=100')).json())
    expect(lama.meta.total).toBe(harapanDaftar(ss(), 'selesai', 365).length)
    expect(lama.meta.total).toBeGreaterThan(badan.meta.total)
  })

  it('semua status dan periode cocok dengan dunia demo, termasuk Ditolak, Dibatalkan, dan Perlu TTD dengan tahapnya', async () => {
    for (const status of STATUS_PERMOHONAN) {
      for (const hari of [14, 365]) {
        const badan = daftarSchema.parse(await (await ambilDaftar('operator', `?status=${status}&periode=${hari}&pageSize=100`)).json())
        const harapan = harapanDaftar(ss(), status, hari)
        expect(badan.meta.total, `${status} ${hari}`).toBe(harapan.length)
        expect(badan.data.map((b) => b.id), `${status} ${hari}`).toEqual(harapan.slice(0, 100).map((p) => p.id))
        for (const [i, b] of badan.data.entries()) expect({ tahap: b.tahap, dikembalikan: b.dikembalikan }, b.id).toEqual({ tahap: harapan[i].tahap, dikembalikan: harapan[i].dikembalikan !== null })
      }
    }
    const diproses = daftarSchema.parse(await (await ambilDaftar('operator', '?status=diproses')).json())
    expect(diproses.data.some((b) => b.dikembalikan)).toBe(true)
  })

  it('?jenis=<kode> menyaring; kode yang tidak dikenal menghasilkan daftar kosong; kode berpola salah 422', async () => {
    const kode = jenisKode(harapanDaftar(ss(), 'selesai', 365)[0])
    const badan = daftarSchema.parse(await (await ambilDaftar('operator', `?status=selesai&periode=365&pageSize=100&jenis=${kode}`)).json())
    const harapan = harapanDaftar(ss(), 'selesai', 365).filter((p) => jenisKode(p) === kode)
    expect(harapan.length).toBeGreaterThan(0)
    expect(badan.data.map((b) => b.id)).toEqual(harapan.slice(0, 100).map((p) => p.id))
    expect(badan.data.every((b) => b.jenis.kode === kode)).toBe(true)
    const kosong = daftarSchema.parse(await (await ambilDaftar('operator', '?jenis=ZZZZ')).json())
    expect(kosong).toEqual({ data: [], meta: { page: 1, pageSize: 25, total: 0 } })
    const salah = await ambilDaftar('operator', '?jenis=skd')
    expect(salah.status).toBe(422)
    expect((await galat(salah)).message).toBe('Filter tidak valid.')
  })

  it('page dan pageSize mengatur potongan dan meta; halaman di luar jangkauan kosong', async () => {
    const harapan = harapanDaftar(ss(), 'selesai', 365)
    const p2 = daftarSchema.parse(await (await ambilDaftar('operator', '?status=selesai&periode=365&page=2&pageSize=25')).json())
    expect(p2.meta).toEqual({ page: 2, pageSize: 25, total: harapan.length })
    expect(p2.data.map((b) => b.id)).toEqual(harapan.slice(25, 50).map((p) => p.id))
    const jauh = daftarSchema.parse(await (await ambilDaftar('operator', '?status=selesai&periode=365&page=999')).json())
    expect(jauh.data).toEqual([])
    expect(jauh.meta.total).toBe(harapan.length)
  })

  it('filter rusak 422 "Filter tidak valid."', async () => {
    for (const q of ['?status=baru', '?periode=7', '?pageSize=10', '?page=0', '?page=abc']) {
      const r = await ambilDaftar('operator', q)
      expect(r.status, q).toBe(422)
      expect((await galat(r)).message, q).toBe('Filter tidak valid.')
    }
  })
})

describe('GET /permohonan/jumlah', () => {
  const jumlah = async (peran: string, query = '', basis = SS) => ambil(app, `${basis}/api/v1/permohonan/jumlah${query}`, kuki[peran])
  const hitungStatus = (daftar: Permohonan[], hari: number) =>
    Object.fromEntries(STATUS_PERMOHONAN.map((s) => [s, daftar.filter((p) => p.status === s && dalamPeriode(p, hari)).length]))

  it('yang terbuka tidak dibatasi periode, yang tertutup dibatasi', async () => {
    for (const hari of [14, 90, 365]) {
      const badan = jumlahPermohonanSchema.parse(await (await jumlah('operator', `?periode=${hari}`)).json())
      expect(badan.status, String(hari)).toEqual(hitungStatus(ss(), hari))
    }
    const bawaan = jumlahPermohonanSchema.parse(await (await jumlah('operator')).json())
    expect(bawaan.status).toEqual(hitungStatus(ss(), 14))
    expect(bawaan.status).toMatchObject({ menunggu: 7, diproses: 5, 'perlu-ttd': 3 })
  })

  it('?jenis=<kode> menyaring angka tab', async () => {
    const kode = jenisKode(harapanDaftar(ss(), 'selesai', 365)[0])
    const badan = jumlahPermohonanSchema.parse(await (await jumlah('operator', `?periode=365&jenis=${kode}`)).json())
    expect(badan.status).toEqual(hitungStatus(ss().filter((p) => jenisKode(p) === kode), 365))
    const kosong = jumlahPermohonanSchema.parse(await (await jumlah('operator', '?jenis=ZZZZ')).json())
    expect(Object.values(kosong.status).every((n) => n === 0)).toBe(true)
  })

  it('perluTindakan sama dengan fungsi kontrak untuk setiap peran atas seluruh data, tanpa dipengaruhi periode atau jenis', async () => {
    for (const peran of ['operator', 'sekdes', 'kades'] as const) {
      const badan = jumlahPermohonanSchema.parse(await (await jumlah(peran, '?periode=14&jenis=ZZZZ')).json())
      expect(badan.perluTindakan, peran).toBe(perluTindakan(peran, ss()))
    }
    const operator = jumlahPermohonanSchema.parse(await (await jumlah('operator')).json())
    expect(operator.perluTindakan).toBeGreaterThan(0)
    const kadus = jumlahPermohonanSchema.parse(await (await jumlah('kadus')).json())
    expect(kadus.perluTindakan).toBe(perluTindakan('kadus', ss().filter((p) => p.dusunId === dusunKadus())))
  })

  it('filter rusak 422', async () => {
    expect((await jumlah('operator', '?periode=7')).status).toBe(422)
    expect((await jumlah('operator', '?jenis=skd')).status).toBe(422)
  })
})

describe('GET /permohonan/:id', () => {
  const detail = async (peran: string, id: string, basis = SS) => ambil(app, `${basis}/api/v1/permohonan/${id}`, kuki[peran])

  it('surat selesai: lolos detailPermohonanSchema dan membawa surat beku, riwayat, dan lembar yang sama dengan dunia demo', async () => {
    const p = ss().find((x) => x.status === 'selesai' && x.terbit && x.riwayat.length > 3) as Permohonan
    const r = await detail('operator', p.id)
    expect(r.status).toBe(200)
    const badan = detailPermohonanSchema.parse(await r.json())
    expect(badan.permohonan).toEqual(p)
    expect(badan.jenis.id).toBe(p.jenisId)
    const pemohon = dunia.penduduk.find((x) => x.id === p.pemohonId)
    expect({ id: badan.pemohon.id, nama: badan.pemohon.nama, nik: badan.pemohon.nik }).toEqual({ id: pemohon?.id, nama: pemohon?.nama, nik: pemohon?.nik })
    const kades = dunia.pengguna.find((u) => u.desaId === ID_SUNGAI_SIALANG && u.peran === 'kades' && u.aktif)
    const sekdes = dunia.pengguna.find((u) => u.desaId === ID_SUNGAI_SIALANG && u.peran === 'sekdes' && u.aktif)
    expect(badan.pejabat).toEqual({ kades: kades?.nama, sekdes: sekdes?.nama, nipKades: kades?.nip ?? null })
    expect(badan.pengaturan.desaId).toBe(ID_SUNGAI_SIALANG)
  })

  it('permohonan sedang berjalan membawa tahap dan catatan pengembalian apa adanya', async () => {
    for (const p of ss().filter((x) => x.status === 'perlu-ttd' || x.dikembalikan !== null)) {
      const badan = detailPermohonanSchema.parse(await (await detail('operator', p.id)).json())
      expect(badan.permohonan, p.id).toEqual(p)
    }
  })

  it('surat dengan subjek dan mutasi membawa keduanya', async () => {
    const p = ss().find((x) => x.subjekId && x.mutasiId) as Permohonan
    expect(p).toBeDefined()
    const badan = detailPermohonanSchema.parse(await (await detail('operator', p.id)).json())
    expect(badan.subjek?.id).toBe(p.subjekId)
    expect(badan.mutasi?.id).toBe(p.mutasiId)
    const biasa = ss().find((x) => !x.subjekId && !x.mutasiId) as Permohonan
    const polos = detailPermohonanSchema.parse(await (await detail('operator', biasa.id)).json())
    expect({ subjek: polos.subjek, mutasi: polos.mutasi }).toEqual({ subjek: null, mutasi: null })
  })

  it('id tidak ada atau milik desa lain 404', async () => {
    for (const id of ['srt_tidak_ada', ID_TL[0]]) {
      const r = await detail('operator', id)
      expect(r.status, id).toBe(404)
      expect((await galat(r)).message).toBe(PESAN_TIDAK_ADA)
    }
    const dariTl = await detail('operatorTl', ss()[0].id, TL)
    expect(dariTl.status).toBe(404)
    expect((await detail('operatorTl', ID_TL[0], TL)).status).toBe(200)
  })
})

describe('GET /permohonan/penduduk/:id', () => {
  const perOrang = async (peran: string, id: string) => ambil(app, `${SS}/api/v1/permohonan/penduduk/${id}`, kuki[peran])

  it('sebagai pemohon dan sebagai yang diterangkan, terbaru dulu, dalam satu halaman', async () => {
    const subjek = ss().find((p) => p.subjekId) as Permohonan
    for (const id of [subjek.pemohonId, subjek.subjekId as string]) {
      const harapan = ss().filter((p) => p.pemohonId === id || p.subjekId === id).sort((a, b) => b.masukPada.localeCompare(a.masukPada) || urutId(a.id, b.id))
      const badan = daftarSchema.parse(await (await perOrang('operator', id)).json())
      expect(badan.data.map((b) => b.id)).toEqual(harapan.map((p) => p.id))
      expect(badan.meta).toEqual({ page: 1, pageSize: Math.max(harapan.length, 1), total: harapan.length })
    }
  })

  it('penduduk yang tidak dikenal menghasilkan daftar kosong, bukan galat', async () => {
    const r = await perOrang('operator', 'pdk_tidak_ada')
    expect(r.status).toBe(200)
    expect(daftarSchema.parse(await r.json())).toEqual({ data: [], meta: { page: 1, pageSize: 1, total: 0 } })
  })
})

describe('GET /permohonan/antrian-ttd', () => {
  const antrean = async (peran: string) => ambil(app, `${SS}/api/v1/permohonan/antrian-ttd`, kuki[peran])
  const jenisDari = (p: Permohonan) => dunia.jenisSurat.find((j) => j.id === p.jenisId) as (typeof dunia.jenisSurat)[number]
  const harapanAntrean = (peran: 'kades' | 'sekdes') =>
    ss()
      .filter((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && peranMengizinkan('tandatangani', peran, jenisDari(p)))
      .sort((a, b) => a.masukPada.localeCompare(b.masukPada) || urutId(a.id, b.id))

  it('Kepala Desa melihat semua surat di tahap tanda tangan, terlama dulu, lengkap dengan detail', async () => {
    const badan = detailPermohonanSchema.array().parse(await (await antrean('kades')).json())
    const harapan = harapanAntrean('kades')
    expect(harapan.length).toBeGreaterThan(0)
    expect(badan.map((d) => d.permohonan.id)).toEqual(harapan.map((p) => p.id))
    for (const d of badan) expect(d.permohonan.tahap).toBe('tanda-tangan')
  })

  it('Sekretaris Desa hanya jenis yang boleh atas nama', async () => {
    const badan = detailPermohonanSchema.array().parse(await (await antrean('sekdes')).json())
    expect(badan.map((d) => d.permohonan.id)).toEqual(harapanAntrean('sekdes').map((p) => p.id))
    for (const d of badan) expect(d.jenis.bolehAtasNama).toBe(true)
  })

  it('Operator, Kepala Dusun, dan Kaur Keuangan 403 "Peran Anda tidak menandatangani surat."', async () => {
    for (const peran of ['operator', 'kadus', 'kaur']) {
      const r = await antrean(peran)
      expect(r.status, peran).toBe(403)
      expect((await galat(r)).message, peran).toBe(PESAN_TTD)
    }
  })
})

describe('hak akses dan cakupan', () => {
  it('Kaur Keuangan 403 di semua rute baca; tanpa sesi 401', async () => {
    const jalur = ['', '/jumlah', `/${ss()[0].id}`, `/penduduk/${ss()[0].pemohonId}`]
    for (const j of jalur) {
      const r = await ambil(app, `${SS}/api/v1/permohonan${j}`, kuki.kaur)
      expect(r.status, j).toBe(403)
      expect((await galat(r)).message, j).toBe(PESAN_LIHAT)
      expect((await ambil(app, `${SS}/api/v1/permohonan${j}`)).status, j).toBe(401)
    }
    expect((await ambil(app, `${SS}/api/v1/permohonan/antrian-ttd`)).status).toBe(401)
  })

  it('Kepala Dusun hanya dusunnya di daftar, jumlah, detail, dan per penduduk', async () => {
    const dusun = dusunKadus()
    const dalam = ss().filter((p) => p.dusunId === dusun)
    const luar = ss().filter((p) => p.dusunId !== dusun)
    expect(dalam.length).toBeGreaterThan(0)
    expect(luar.length).toBeGreaterThan(0)
    const badan = daftarSchema.parse(await (await ambilDaftar('kadus', '?status=selesai&periode=365&pageSize=100')).json())
    const harapan = harapanDaftar(dalam, 'selesai', 365)
    expect(badan.meta.total).toBe(harapan.length)
    expect(badan.data.map((b) => b.id)).toEqual(harapan.slice(0, 100).map((p) => p.id))
    const jumlah = jumlahPermohonanSchema.parse(await (await ambil(app, `${SS}/api/v1/permohonan/jumlah?periode=365`, kuki.kadus)).json())
    expect(jumlah.status.selesai).toBe(harapan.length)
    const dalamId = dalam[0].id
    expect((await ambil(app, `${SS}/api/v1/permohonan/${dalamId}`, kuki.kadus)).status).toBe(200)
    const asing = await ambil(app, `${SS}/api/v1/permohonan/${luar[0].id}`, kuki.kadus)
    expect(asing.status).toBe(404)
    expect((await galat(asing)).message).toBe(PESAN_TIDAK_ADA)
    const orangLuar = luar.find((p) => !dalam.some((d) => d.pemohonId === p.pemohonId || d.subjekId === p.pemohonId)) as Permohonan
    const perOrang = daftarSchema.parse(await (await ambil(app, `${SS}/api/v1/permohonan/penduduk/${orangLuar.pemohonId}`, kuki.kadus)).json())
    expect(perOrang.data).toEqual([])
  })

  it('subjek di dusun lain tetap terbaca pada permohonan yang masuk cakupan', async () => {
    const dusun = dusunKadus()
    const kandidat = ss().filter((p) => p.dusunId === dusun && p.subjekId)
    const lintas = kandidat.find((p) => dunia.penduduk.find((x) => x.id === p.subjekId)?.dusunId !== dusun)
    if (!lintas) return
    const badan = detailPermohonanSchema.parse(await (await ambil(app, `${SS}/api/v1/permohonan/${lintas.id}`, kuki.kadus)).json())
    expect(badan.subjek?.id).toBe(lintas.subjekId)
  })

  it('desa lain hanya melihat permohonannya sendiri', async () => {
    const tl = daftarSchema.parse(await (await ambilDaftar('operatorTl', '', TL)).json())
    expect(tl.data.map((b) => b.id)).toEqual([ID_TL[1], ID_TL[0]])
    expect(tl.data[0].pemohon).toMatchObject({ nama: 'Warga Tanjung Lamo', nik: '1405095203910001' })
    const ssMenunggu = daftarSchema.parse(await (await ambilDaftar('operator')).json())
    expect(ssMenunggu.data.some((b) => ID_TL.includes(b.id))).toBe(false)
    const jumlahTl = jumlahPermohonanSchema.parse(await (await ambil(app, `${TL}/api/v1/permohonan/jumlah`, kuki.operatorTl)).json())
    expect(jumlahTl.status.menunggu).toBe(2)
    const orangTl = daftarSchema.parse(await (await ambil(app, `${SS}/api/v1/permohonan/penduduk/pdk_uji_tl`, kuki.operator)).json())
    expect(orangTl.data).toEqual([])
  })

  it('GET murni: jumlah baris permohonan dan riwayat_surat tidak berubah', async () => {
    const sebelum = await hitungBaris()
    for (const j of ['', '?status=selesai', '/jumlah', `/${ss()[0].id}`, `/penduduk/${ss()[0].pemohonId}`, '/antrian-ttd']) {
      await ambil(app, `${SS}/api/v1/permohonan${j}`, kuki.kades)
    }
    expect(await hitungBaris()).toEqual(sebelum)
  })
})

describe('titik sambung 8F1 yang kini terisi', () => {
  it('GET /jenis-surat: jumlahPakai = permohonan 12 bulan terakhir per jenis, dipakai = pernah dipakai kapan pun', async () => {
    const badan = z.object({ data: jenisDenganPakaiSchema.array() }).parse(await (await ambil(app, `${SS}/api/v1/jenis-surat`, kuki.operator)).json())
    const awal = awalPeriode(365, SEKARANG_UJI)
    for (const j of badan.data) {
      const harapan = ss().filter((p) => p.jenisId === j.id)
      const jumlah = harapan.filter((p) => p.masukPada.slice(0, 10) >= awal).length
      expect({ pakai: j.jumlahPakai, dipakai: j.dipakai }, j.kode).toEqual({ pakai: jumlah, dipakai: harapan.length > 0 })
    }
    expect(badan.data.some((j) => j.jumlahPakai > 0)).toBe(true)
    // "Pernah dipakai" tidak dibatasi 12 bulan: ada jenis yang hanya terpakai lebih dari setahun lalu atau jumlahnya berbeda.
    expect(badan.data.some((j) => j.dipakai)).toBe(true)
  })

  it('GET /pengaturan/penomoran: contoh mengikuti nomor yang sudah terbit', async () => {
    const r = await ambil(app, `${SS}/api/v1/pengaturan/penomoran`, kuki.operator)
    expect(r.status).toBe(200)
    const badan = penomoranSchema.parse(await r.json())
    const harapan = susunPenomoran({
      formatNomor: badan.formatNomor,
      urutan: badan.urutan,
      kodeSurat: badan.kodeSurat,
      jenis: dunia.jenisSurat.filter((j) => j.desaId === ID_SUNGAI_SIALANG),
      terbit: ss().flatMap((p) => (p.terbit ? [{ jenisId: p.jenisId, tahun: p.terbit.tahun, urut: p.terbit.urut }] : [])),
      tahun: 2026,
    })
    expect(badan.contoh).toEqual(harapan.contoh)
    expect(badan.contoh.urutPerTahun).toBeGreaterThan(1)
  })
})

describe('POST /permohonan/cari (rencana 8F2a Tugas 5)', () => {
  const cariPermohonan = (badan: unknown, peran: string | null = 'operator') => kirimJson(app, SS, '/api/v1/permohonan/cari', badan, peran === null ? null : kuki[peran])
  const orang = (id: string | null) => (id === null ? undefined : dunia.penduduk.find((x) => x.id === id))
  const harapanCari = (daftar: Permohonan[], kata: string, jenis: string | null) =>
    daftar
      .filter((p) => jenis === null || jenisKode(p) === jenis)
      .filter((p) =>
        kata.includes('/')
          ? (p.terbit?.nomor.includes(kata.toUpperCase()) ?? false)
          : [p.pemohonId, p.subjekId].some((id) => {
              const o = orang(id)
              return o !== undefined && cocokPenduduk(o, kata, '')
            }),
      )
      .sort((a, b) => b.masukPada.localeCompare(a.masukPada) || urutId(a.id, b.id))
  const hasil = async (badan: unknown, peran: string | null = 'operator') => {
    const r = await cariPermohonan(badan, peran)
    expect(r.status).toBe(200)
    return daftarSchema.parse(await r.json())
  }
  /** Penduduk yang paling sering menjadi pemohon: kata cari yang menghasilkan beberapa permohonan lintas status. */
  const pemohonRamai = () => {
    const hitungan = new Map<string, number>()
    for (const p of ss()) hitungan.set(p.pemohonId, (hitungan.get(p.pemohonId) ?? 0) + 1)
    const [id] = [...hitungan].sort((a, b) => b[1] - a[1] || urutId(a[0], b[0]))[0]
    return orang(id) as NonNullable<ReturnType<typeof orang>>
  }

  it('nama pemohon: semua status, terbaru dulu, sama dengan pencocokan kontrak atas dunia demo', async () => {
    const o = pemohonRamai()
    const harapan = harapanCari(ss(), o.nama, null)
    expect(harapan.length).toBeGreaterThan(1)
    const badan = await hasil({ kata: o.nama, jenis: null })
    expect(badan.data.map((b) => b.id)).toEqual(harapan.slice(0, 100).map((p) => p.id))
    expect(badan.meta).toEqual({ page: 1, pageSize: 100, total: harapan.length })
  })

  it('potongan NIK (4 angka atau lebih) menemukan permohonan pemilik NIK itu', async () => {
    const o = pemohonRamai()
    const kata = (o.nik as string).slice(4, 12)
    const harapan = harapanCari(ss(), kata, null)
    expect(harapan.length).toBeGreaterThan(0)
    expect((await hasil({ kata, jenis: null })).data.map((b) => b.id)).toEqual(harapan.slice(0, 100).map((p) => p.id))
  })

  it('kata bergaris miring dibaca nomor surat, huruf besar dan kecil sama', async () => {
    const p = ss().find((x) => x.terbit) as Permohonan
    const nomor = p.terbit?.nomor as string
    const harapan = harapanCari(ss(), nomor, null)
    expect(harapan.map((x) => x.id)).toContain(p.id)
    expect((await hasil({ kata: nomor, jenis: null })).data.map((b) => b.id)).toEqual(harapan.map((x) => x.id))
    expect((await hasil({ kata: nomor.toLowerCase(), jenis: null })).data.map((b) => b.id)).toEqual(harapan.map((x) => x.id))
    expect((await hasil({ kata: '9999/ZZZ/XX', jenis: null })).data).toEqual([])
  })

  it('orang yang diterangkan (subjek) ikut dicari', async () => {
    const p = ss().find((x) => x.subjekId) as Permohonan
    const subjek = orang(p.subjekId)
    const badan = await hasil({ kata: subjek?.nama as string, jenis: null })
    expect(badan.data.map((b) => b.id)).toContain(p.id)
  })

  it('?jenis menyaring dan jenis yang tidak dikenal menghasilkan daftar kosong', async () => {
    const o = pemohonRamai()
    const kode = jenisKode(harapanCari(ss(), o.nama, null)[0])
    const harapan = harapanCari(ss(), o.nama, kode)
    const badan = await hasil({ kata: o.nama, jenis: kode })
    expect(badan.data.map((b) => b.id)).toEqual(harapan.map((p) => p.id))
    expect(badan.data.every((b) => b.jenis.kode === kode)).toBe(true)
    expect((await hasil({ kata: o.nama, jenis: 'ZZZZ' })).data).toEqual([])
  })

  it('kata yang belum cukup (satu huruf, tiga angka) menghasilkan daftar kosong, bukan galat', async () => {
    for (const kata of ['a', '140']) expect((await hasil({ kata, jenis: null })).data, kata).toEqual([])
  })

  it('kata aneh tetap aman: karakter pola SQL dan kutip hanya dicocokkan sebagai teks', async () => {
    for (const kata of ['%%', '__', "'; drop table permohonan;--", '/']) expect(Array.isArray((await hasil({ kata, jenis: null })).data), kata).toBe(true)
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from permohonan`)[0].n)).toBeGreaterThan(700)
  })

  it('kata kosong, lebih dari 100 karakter, jenis berpola salah, atau badan bukan JSON → 422', async () => {
    for (const badan of [{ kata: '', jenis: null }, { kata: '   ', jenis: null }, { kata: 'a'.repeat(101), jenis: null }, { kata: 'siti', jenis: 'skd' }, { kata: 'siti' }, null]) {
      const r = await cariPermohonan(badan)
      expect(r.status, JSON.stringify(badan)).toBe(422)
      expect((await galat(r)).code).toBe('VALIDATION')
    }
  })

  it('Kepala Dusun hanya mendapat permohonan dusunnya; Kaur Keuangan 403; tanpa sesi 401', async () => {
    const dusun = dusunKadus()
    const dalam = ss().filter((p) => p.dusunId === dusun)
    const o = orang(dalam[0].pemohonId) as NonNullable<ReturnType<typeof orang>>
    const harapan = harapanCari(dalam, o.nama, null)
    expect(harapan.length).toBeGreaterThan(0)
    const badan = await hasil({ kata: o.nama, jenis: null }, 'kadus')
    expect(badan.data.map((b) => b.id)).toEqual(harapan.slice(0, 100).map((p) => p.id))
    const luar = ss().find((p) => p.dusunId !== dusun && !dalam.some((d) => d.pemohonId === p.pemohonId || d.subjekId === p.pemohonId)) as Permohonan
    const orangLuar = orang(luar.pemohonId) as NonNullable<ReturnType<typeof orang>>
    expect((await hasil({ kata: orangLuar.nama, jenis: null }, 'kadus')).data.every((b) => dalam.some((d) => d.id === b.id))).toBe(true)
    const r = await cariPermohonan({ kata: o.nama, jenis: null }, 'kaur')
    expect(r.status).toBe(403)
    expect((await galat(r)).message).toBe(PESAN_LIHAT)
    expect((await cariPermohonan({ kata: o.nama, jenis: null }, null)).status).toBe(401)
  })

  it('pencarian murni: jumlah baris tidak berubah', async () => {
    const sebelum = await hitungBaris()
    await cariPermohonan({ kata: pemohonRamai().nama, jenis: null })
    expect(await hitungBaris()).toEqual(sebelum)
  })
})

describe('GET /permohonan/saran (rencana 8F2a Tugas 5)', () => {
  const saran = async (peran: string, query: string) => ambil(app, `${SS}/api/v1/permohonan/saran${query}`, kuki[peran])
  const jenisSs = () => dunia.jenisSurat.filter((j) => j.desaId === ID_SUNGAI_SIALANG)
  /** Mutasi terbaru orang itu yang sesuai jenis suratnya, lalu isian awal dari fungsi kontrak: pembanding tanpa kode server. */
  const harapanSaran = (kode: string, orangId: string) => {
    const jenis = jenisSs().find((j) => j.kode === kode) as (typeof dunia.jenisSurat)[number]
    const jenisMutasi = JENIS_MUTASI_SURAT[kode]
    const mutasi =
      jenisMutasi === undefined
        ? null
        : (dunia.mutasi.filter((m) => m.desaId === ID_SUNGAI_SIALANG && m.jenis === jenisMutasi && m.pendudukIds.includes(orangId)).sort((a, b) => b.dicatatPada.localeCompare(a.dicatatPada))[0] ?? null)
    const cari = (id: string) => dunia.penduduk.find((x) => x.id === id && x.desaId === ID_SUNGAI_SIALANG)
    const keluarga = dunia.penduduk.filter((x) => x.desaId === ID_SUNGAI_SIALANG && x.keluargaId === cari(orangId)?.keluargaId)
    return { mutasi, ...saranDariMutasi(jenis, mutasi, cari, keluarga) }
  }
  const orangMutasi = (jenisMutasi: 'lahir' | 'meninggal' | 'pindah') => {
    const m = dunia.mutasi.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.jenis === jenisMutasi) as (typeof dunia.mutasi)[number]
    expect(m, jenisMutasi).toBeDefined()
    return m.pendudukIds[0]
  }

  it.each([
    ['SKL', 'lahir', 'subjek'],
    ['SKM', 'meninggal', 'subjek'],
    ['SPP', 'pindah', 'pemohon'],
  ] as const)('%s mengambil mutasi %s terbaru dari %s', async (kode, jenisMutasi, peran) => {
    const id = orangMutasi(jenisMutasi)
    const harapan = harapanSaran(kode, id)
    expect(harapan.mutasi).not.toBeNull()
    const r = await saran('operator', `?jenis=${kode}&${peran}=${id}`)
    expect(r.status).toBe(200)
    const badan = saranSuratSchema.parse(await r.json())
    expect(badan.mutasi?.id).toBe(harapan.mutasi?.id)
    expect(badan.pemohonId).toBe(harapan.pemohonId)
    expect(badan.isian).toEqual(harapan.isian)
    expect(badan.pengaturan.desaId).toBe(ID_SUNGAI_SIALANG)
    expect(badan.pejabat.kades).toBe('H. Muhammad Nasir')
  })

  it('kelahiran menyarankan orang tua yang hidup', async () => {
    const lahir = saranSuratSchema.parse(await (await saran('operator', `?jenis=SKL&subjek=${orangMutasi('lahir')}`)).json())
    expect(lahir.pemohonId).not.toBeNull()
    expect(dunia.penduduk.find((x) => x.id === lahir.pemohonId)?.statusDasar).toBe('Hidup')
  })

  it('tanpa mutasi yang cocok saran kosong, tetap membawa pengaturan dan pejabat', async () => {
    const id = ss()[0].pemohonId
    const badan = saranSuratSchema.parse(await (await saran('sekdes', `?jenis=SKD&pemohon=${id}`)).json())
    expect({ mutasi: badan.mutasi, pemohonId: badan.pemohonId, isian: badan.isian }).toEqual({ mutasi: null, pemohonId: null, isian: {} })
    expect(badan.pengaturan.desaId).toBe(ID_SUNGAI_SIALANG)
    const tanpaOrang = saranSuratSchema.parse(await (await saran('operator', '?jenis=SKL')).json())
    expect(tanpaOrang.mutasi).toBeNull()
  })

  it('kode berpola salah atau hilang 422; kode yang tidak ada 404', async () => {
    for (const q of ['', '?jenis=skd', '?jenis=A', '?jenis=ABCDEFG']) {
      const r = await saran('operator', q)
      expect(r.status, q).toBe(422)
      expect((await galat(r)).message).toBe('Permintaan saran tidak valid.')
    }
    const r = await saran('operator', '?jenis=ZZZZ')
    expect(r.status).toBe(404)
    expect((await galat(r)).message).toBe('Jenis surat tidak ditemukan.')
  })

  it('hanya yang berhak membuat surat: Kepala Desa, Kepala Dusun, dan Kaur Keuangan 403; tanpa sesi 401', async () => {
    for (const peran of ['kades', 'kadus', 'kaur']) {
      const r = await saran(peran, '?jenis=SKD')
      expect(r.status, peran).toBe(403)
      expect((await galat(r)).message, peran).toBe('Peran Anda tidak berhak membuat surat.')
    }
    expect((await ambil(app, `${SS}/api/v1/permohonan/saran?jenis=SKD`)).status).toBe(401)
  })

  it('orang desa lain tidak dikenal: saran kosong, bukan data desa lain', async () => {
    const badan = saranSuratSchema.parse(await (await saran('operator', '?jenis=SKL&subjek=pdk_uji_tl')).json())
    expect(badan.mutasi).toBeNull()
  })
})
