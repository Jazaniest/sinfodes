import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { cocokPenduduk } from '@sinfodes/kontrak/penduduk/cari'
import { filterPendudukSchema, saringPenduduk, urutkanPenduduk } from '@sinfodes/kontrak/penduduk/filter'
import { entriRiwayatSchema } from '@sinfodes/kontrak/penduduk/riwayat'
import { barisPendudukSchema, pendudukSchema, ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const NIK_SITI = '1405095203918002'
const KK_SITI = '1405092011238004'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let baris: string[]
let kukiOperator: string
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  const r = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) })
  app = r.app
  baris = r.baris
  kukiOperator = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.9.0.1')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

const skemaDaftar = daftarSchema(barisPendudukSchema)

/** Hasil yang seharusnya, dihitung dari dunia demo dengan fungsi kontrak yang sama dengan API tiruan. */
function harapan(mentah: Record<string, string | number>, kata: string | null, dusunSaja: string | null = null) {
  const filter = filterPendudukSchema.parse(mentah)
  const nomorKk = new Map(dunia.keluarga.map((k) => [k.id, k.nomorKk] as const))
  const dusunDesa = dunia.dusun.filter((d) => d.desaId === ID_SUNGAI_SIALANG)
  // Perbedaan sengaja: baris yang kunci urutnya sama berurutan menurut ID (perbandingan kode), bukan urutan pembangkitan.
  const milik = dunia.penduduk
    .filter((p) => p.desaId === ID_SUNGAI_SIALANG && (dusunSaja === null || p.dusunId === dusunSaja))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const calon = kata === null ? milik : milik.filter((p) => cocokPenduduk(p, kata, nomorKk.get(p.keluargaId) ?? ''))
  const tersaring = saringPenduduk(calon, filter, {
    hariIni: SEKARANG_UJI,
    dusunIdPerNomor: new Map(dusunDesa.map((d) => [d.nomor, d.id] as const)),
    idPendatangTahunIni: new Set<string>(),
  })
  const urut = urutkanPenduduk(tersaring, filter.urut, { nomorDusun: (id) => dusunDesa.find((d) => d.id === id)?.nomor ?? Number.MAX_SAFE_INTEGER })
  const mulai = (filter.page - 1) * filter.pageSize
  return { total: urut.length, halaman: urut.slice(mulai, mulai + filter.pageSize).map((p) => ({ ...p, nomorKk: nomorKk.get(p.keluargaId) ?? '' })) }
}

const daftar = async (query: string, kuki: string | null = kukiOperator, basis = SS) =>
  ambil(app, `${basis}/api/v1/penduduk${query}`, kuki)
const cari = async (badan: unknown, kuki: string | null = kukiOperator, basis = SS) =>
  kirimJson(app, basis, '/api/v1/penduduk/cari', badan, kuki)

describe('GET /penduduk', () => {
  it('bawaan: 25 baris urut nama, total 2.812 jiwa, setiap kolom sama dengan dunia demo (terenkripsi lalu dibuka kembali)', async () => {
    const r = await daftar('')
    expect(r.status).toBe(200)
    const isi = skemaDaftar.parse(await r.json())
    const h = harapan({}, null)
    expect(isi.meta).toEqual({ page: 1, pageSize: 25, total: 2812 })
    expect(h.total).toBe(2812)
    expect(isi.data).toHaveLength(25)
    expect(isi.data).toEqual(h.halaman)
    for (const b of isi.data) expect(b.nomorKk).toMatch(/^\d{16}$/)
  })

  it.each([
    ['halaman 2', '?page=2'],
    ['halaman 3 ukuran 50', '?page=3&pageSize=50'],
    ['urut umur', '?urut=umur'],
    ['urut dusun', '?urut=dusun&page=2'],
    ['urut diubah', '?urut=diubah'],
    ['jenis kelamin perempuan', '?jk=P'],
    ['dusun 2', '?dusun=2'],
    ['dusun 3 RT 002 laki-laki', '?dusun=3&rt=002&jk=L'],
    ['mantan penduduk (status Meninggal) tidak ikut jiwa', '?status=Meninggal'],
    ['status Pindah', '?status=Pindah'],
    ['rentang umur 17-40', '?umurMin=17&umurMax=40'],
    ['preset balita', '?preset=balita'],
    ['preset lansia', '?preset=lansia'],
    ['preset data belum lengkap', '?preset=data-belum-lengkap'],
    ['preset wajib KTP belum rekam', '?preset=wajib-ktp-belum-rekam'],
  ])('saringan dan urutan sama dengan API tiruan: %s', async (_nama, query) => {
    const mentah = Object.fromEntries(new URLSearchParams(query)) as Record<string, string>
    const isi = skemaDaftar.parse(await (await daftar(query)).json())
    const h = harapan(mentah, null)
    expect(isi.meta.total).toBe(h.total)
    expect(isi.data).toEqual(h.halaman)
  })

  it('saringan tidak valid: 422 VALIDATION; preset pendatang menunggu modul mutasi (8E): 422 dengan pesan jelas', async () => {
    const rusak = await daftar('?page=0')
    expect(rusak.status).toBe(422)
    expect(galatSchema.parse(await rusak.json()).error.code).toBe('VALIDATION')
    // Perbedaan sengaja: API tiruan menghitung "pendatang tahun ini" dari mutasi; tabel mutasi baru ada di 8E.
    const pendatang = await daftar('?preset=pendatang-tahun-ini')
    expect(pendatang.status).toBe(422)
    expect(galatSchema.parse(await pendatang.json()).error.message).toMatch(/belum tersedia/)
  })

  it('tanpa cookie UNAUTHENTICATED; Kaur Keuangan FORBIDDEN dengan pesan yang sama dengan tiruan', async () => {
    const tanpa = await daftar('', null)
    expect(tanpa.status).toBe(401)
    expect(galatSchema.parse(await tanpa.json()).error.code).toBe('UNAUTHENTICATED')
    const kaur = (await masukLewatRute(app, SS, 'nurhayati@sungaisialang.desa.id', 'demo', '10.9.0.2')).kuki
    const r = await daftar('', kaur)
    expect(r.status).toBe(403)
    expect(galatSchema.parse(await r.json()).error).toEqual({ code: 'FORBIDDEN', message: 'Peran Anda tidak berhak melihat data penduduk.' })
  })

  it('Kepala Dusun II hanya melihat dusunnya, dan tidak menemukan NIK dusun lain', async () => {
    const kadus = (await masukLewatRute(app, SS, 'sukardi@sungaisialang.desa.id', 'demo', '10.9.0.3')).kuki
    const isi = skemaDaftar.parse(await (await daftar('', kadus)).json())
    const h = harapan({}, null, 'dsn_ss_2')
    expect(isi.meta.total).toBe(h.total)
    expect(h.total).toBeLessThan(2812)
    expect(isi.data).toEqual(h.halaman)
    const asing = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.dusunId !== 'dsn_ss_2' && p.nik !== null && p.statusDasar === 'Hidup')
    const hasil = skemaDaftar.parse(await (await cari({ kata: asing?.nik, filter: {} }, kadus)).json())
    expect(hasil.data).toHaveLength(0)
  })

  it('desa lain tidak terlihat: operator Tanjung Lamo mendapat daftar kosong, dan cookie Sungai Sialang tidak berlaku di sana', async () => {
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.9.0.4')).kuki
    const isi = skemaDaftar.parse(await (await daftar('', yusri, TL)).json())
    expect(isi.meta.total).toBe(0)
    expect((await daftar('', kukiOperator, TL)).status).toBe(401)
  })
})

describe('POST /penduduk/cari', () => {
  it('lewat NIK berspasi menemukan satu orang beserta nomor KK-nya', async () => {
    const isi = skemaDaftar.parse(await (await cari({ kata: '140509 520391 8002', filter: {} })).json())
    expect(isi.data).toHaveLength(1)
    expect(isi.data[0]).toMatchObject({ nama: 'Siti Rahmah', nik: NIK_SITI, nomorKk: KK_SITI })
  })

  it('lewat potongan nomor KK menemukan seluruh anggota walau terenkripsi', async () => {
    const isi = skemaDaftar.parse(await (await cari({ kata: '2011238004', filter: {} })).json())
    expect(isi.meta.total).toBe(4)
    expect(isi.data.every((b) => b.nomorKk === KK_SITI)).toBe(true)
  })

  it('lewat nama, dengan potongan kata dan huruf besar kecil bebas', async () => {
    const isi = skemaDaftar.parse(await (await cari({ kata: 'rah SITI', filter: {} })).json())
    const h = harapan({}, 'rah SITI')
    expect(isi.meta.total).toBe(h.total)
    expect(isi.data).toEqual(h.halaman)
    expect(isi.data.some((b) => b.nama === 'Siti Rahmah')).toBe(true)
  })

  it('kata terlalu pendek tidak mencocokkan apa pun, dan angka kurang dari 4 digit juga', async () => {
    expect(skemaDaftar.parse(await (await cari({ kata: 'a', filter: {} })).json()).meta.total).toBe(0)
    expect(skemaDaftar.parse(await (await cari({ kata: '123', filter: {} })).json()).meta.total).toBe(0)
  })

  it('pencarian tetap menghormati filter', async () => {
    const isi = skemaDaftar.parse(await (await cari({ kata: '2011238004', filter: { jk: 'P' } })).json())
    const h = harapan({ jk: 'P' }, '2011238004')
    expect(isi.meta.total).toBe(h.total)
    expect(isi.data).toEqual(h.halaman)
    expect(isi.data.every((b) => b.jenisKelamin === 'P')).toBe(true)
  })

  it('isian tidak valid: 422; tanpa cookie: 401', async () => {
    expect((await cari({ kata: '', filter: {} })).status).toBe(422)
    expect((await cari({ kata: 'siti' })).status).toBe(422)
    expect((await cari({ kata: 'siti', filter: {} }, null)).status).toBe(401)
  })
})

describe('GET /penduduk/ringkasan', () => {
  it('2.812 jiwa, 806 KK, diperbarui hari ini', async () => {
    const r = await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kukiOperator)
    expect(r.status).toBe(200)
    const isi = ringkasanPendudukSchema.parse(await r.json())
    expect(isi).toMatchObject({ jiwa: 2812, kk: 806 })
    expect(isi.diperbaruiPada?.startsWith('2026-09-24')).toBe(true)
    const maks = dunia.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG).reduce((m, p) => (p.diubahPada > m ? p.diubahPada : m), '')
    expect(isi.diperbaruiPada).toBe(maks)
  })

  it('Kepala Dusun hanya menghitung dusunnya; Kaur Keuangan FORBIDDEN; tanpa cookie 401', async () => {
    const kadus = (await masukLewatRute(app, SS, 'sukardi@sungaisialang.desa.id', 'demo', '10.9.1.1')).kuki
    const isi = ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kadus)).json())
    const jiwa = dunia.penduduk.filter((p) => p.dusunId === 'dsn_ss_2' && p.statusDasar === 'Hidup').length
    expect(isi.jiwa).toBe(jiwa)
    const kaur = (await masukLewatRute(app, SS, 'nurhayati@sungaisialang.desa.id', 'demo', '10.9.1.2')).kuki
    expect((await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kaur)).status).toBe(403)
    expect((await ambil(app, `${SS}/api/v1/penduduk/ringkasan`)).status).toBe(401)
  })
})

describe('anggaran waktu dan log (Review Focus 4 dan 5)', () => {
  it('daftar dan pencarian untuk 2.812 jiwa selesai di bawah 1,5 detik; waktu dicatat sebagai pengukuran', async () => {
    await daftar('') // pemanasan kolam dan JIT
    const ukur = async (fn: () => Promise<Response>) => {
      const waktu: number[] = []
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now()
        const r = await fn()
        await r.arrayBuffer()
        waktu.push(performance.now() - t0)
      }
      return waktu.sort((a, b) => a - b)
    }
    const daftarMs = await ukur(() => daftar('?page=2'))
    const cariMs = await ukur(() => cari({ kata: '2011238004', filter: {} }))
    console.info(`[ukur 8C] GET /penduduk (2.812 jiwa): median ${daftarMs[2].toFixed(0)} ms, maks ${daftarMs[4].toFixed(0)} ms | POST /penduduk/cari: median ${cariMs[2].toFixed(0)} ms, maks ${cariMs[4].toFixed(0)} ms`)
    expect(daftarMs[4]).toBeLessThan(1500)
    expect(cariMs[4]).toBeLessThan(1500)
  })

  it('log permintaan tidak memuat NIK, nomor KK, atau cookie', () => {
    const semua = baris.join('\n')
    expect(semua.length).toBeGreaterThan(0)
    expect(semua).not.toContain(NIK_SITI)
    expect(semua).not.toContain(KK_SITI)
    expect(semua).not.toContain(kukiOperator.split('=')[1])
  })
})

describe('GET /penduduk/:id dan /penduduk/:id/riwayat', () => {
  const detail = (id: string, kuki: string | null = kukiOperator, basis = SS) => ambil(app, `${basis}/api/v1/penduduk/${id}`, kuki)
  const riwayat = (id: string, kuki: string | null = kukiOperator, basis = SS) => ambil(app, `${basis}/api/v1/penduduk/${id}/riwayat`, kuki)

  it('detail sama dengan dunia demo: NIK dan telepon terbuka dari sandi', async () => {
    const r = await detail('pdk_siti_rahmah')
    expect(r.status).toBe(200)
    expect(pendudukSchema.parse(await r.json())).toEqual(dunia.penduduk.find((p) => p.id === 'pdk_siti_rahmah'))
  })

  it('mantan penduduk tetap bisa dibuka lewat id', async () => {
    const mantan = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Meninggal') as NonNullable<DbDemo['penduduk'][number]>
    expect(pendudukSchema.parse(await (await detail(mantan.id)).json()).statusDasar).toBe('Meninggal')
  })

  it('id tak dikenal 404 dengan pesan tiruan, baik untuk detail maupun riwayat', async () => {
    for (const r of [await detail('pdk_tidak_ada'), await riwayat('pdk_tidak_ada')]) {
      expect(r.status).toBe(404)
      expect(galatSchema.parse(await r.json()).error).toMatchObject({ code: 'NOT_FOUND', message: 'Data penduduk tidak ditemukan.' })
    }
  })

  it('riwayat: terbaru dulu, perubahan field dari dunia demo, data lama diawali entri pembuatan (Ruling 8: belum ada entri mutasi)', async () => {
    const sasaran = dunia.riwayat.reduce<Map<string, number>>((m, r) => m.set(r.pendudukId, (m.get(r.pendudukId) ?? 0) + 1), new Map())
    const [pendudukId] = [...sasaran].sort((a, b) => b[1] - a[1])[0]
    const entri = entriRiwayatSchema.array().parse(await (await riwayat(pendudukId)).json())
    const waktu = entri.map((e) => e.waktu)
    expect(waktu).toEqual([...waktu].sort().reverse())
    const ubah = entri.filter((e) => e.jenis === 'ubah')
    const asal = dunia.riwayat.filter((r) => r.pendudukId === pendudukId)
    expect(ubah.map((e) => e.id).sort()).toEqual(asal.map((r) => r.id).sort())
    const contoh = ubah[0]
    const aslinya = asal.find((r) => r.id === contoh.id)
    expect(contoh).toMatchObject({ jenis: 'ubah', field: aslinya?.field, nilaiLama: aslinya?.nilaiLama, nilaiBaru: aslinya?.nilaiBaru, oleh: aslinya?.oleh })
    expect(entri.at(-1)).toMatchObject({ jenis: 'dibuat', id: `dibuat-${pendudukId}` })
    expect(entri.filter((e) => e.jenis === 'mutasi')).toHaveLength(0)
  })

  it('Kaur Keuangan 403, tanpa login 401, desa lain 404', async () => {
    const kaur = (await masukLewatRute(app, SS, 'nurhayati@sungaisialang.desa.id', 'demo', '10.9.2.1')).kuki
    for (const f of [detail, riwayat]) {
      const r = await f('pdk_siti_rahmah', kaur)
      expect(r.status).toBe(403)
      expect(galatSchema.parse(await r.json()).error.message).toBe('Peran Anda tidak berhak melihat data penduduk.')
      expect((await f('pdk_siti_rahmah', null)).status).toBe(401)
    }
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.9.2.2')).kuki
    expect((await detail('pdk_siti_rahmah', yusri, TL)).status).toBe(404)
    expect((await riwayat('pdk_siti_rahmah', yusri, TL)).status).toBe(404)
  })

  it('Kepala Dusun II: warga dusun lain 404 (detail dan riwayat), warga dusunnya terbuka (fokus 4)', async () => {
    const kadus = (await masukLewatRute(app, SS, 'sukardi@sungaisialang.desa.id', 'demo', '10.9.2.3')).kuki
    expect((await detail('pdk_siti_rahmah', kadus)).status).toBe(404)
    expect((await riwayat('pdk_siti_rahmah', kadus)).status).toBe(404)
    const sendiri = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.dusunId === 'dsn_ss_2') as NonNullable<DbDemo['penduduk'][number]>
    expect((await detail(sendiri.id, kadus)).status).toBe(200)
    expect((await riwayat(sendiri.id, kadus)).status).toBe(200)
  })
})
