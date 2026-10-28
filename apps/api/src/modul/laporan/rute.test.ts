import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { hasilTerapkanSchema, laporanDataSchema, type IsiLaporan } from '@sinfodes/kontrak/laporan/schema'
import { entriRiwayatSchema } from '@sinfodes/kontrak/penduduk/riwayat'
import { pendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import type { Penyandi } from '../../kripto/penyandi'
import { sandikanIsiLaporan } from './sandi'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'
const PESAN_LIHAT = 'Peran Anda tidak berhak melihat laporan data warga.'
const skemaDaftar = daftarSchema(laporanDataSchema)
const hasilTolakSchema = z.object({ laporan: laporanDataSchema })
const z2 = (isi: unknown) => hasilTolakSchema.parse(isi)

let uji: DbUji
let dunia: DbDemo
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let kuki: Record<'operator' | 'sekdes' | 'kades' | 'kadus' | 'kaur' | 'yusri', string>
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const masuk = async (basis: string, email: string, ip: string) => (await masukLewatRute(app, basis, email, 'demo', ip)).kuki as string
  kuki = {
    operator: await masuk(SS, 'rosmiati@sungaisialang.desa.id', '10.4.0.1'),
    sekdes: await masuk(SS, 'hendri@sungaisialang.desa.id', '10.4.0.2'),
    kades: await masuk(SS, 'kades@sungaisialang.desa.id', '10.4.0.3'),
    kadus: await masuk(SS, 'sukardi@sungaisialang.desa.id', '10.4.0.4'),
    kaur: await masuk(SS, 'nurhayati@sungaisialang.desa.id', '10.4.0.5'),
    yusri: await masuk(TL, 'operator@tanjunglamo.desa.id', '10.4.0.6'),
  }
})
afterAll(async () => {
  await uji?.tutup()
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const daftar = (query = '', k: string | null = kuki.operator, basis = SS) => ambil(app, `${basis}/api/v1/laporan-data${query}`, k)
const detail = (id: string, k: string | null = kuki.operator, basis = SS) => ambil(app, `${basis}/api/v1/laporan-data/${id}`, k)
const terapkan = async (id: string, k: string | null = kuki.operator, basis = SS): Promise<Response> => kirimJson(app, basis, `/api/v1/laporan-data/${id}/terapkan`, {}, k)
const tolak = async (id: string, badan: unknown, k: string | null = kuki.operator, basis = SS): Promise<Response> => kirimJson(app, basis, `/api/v1/laporan-data/${id}/tolak`, badan, k)
const riwayatDari = async (id: string) => entriRiwayatSchema.array().parse(await (await ambil(app, `${SS}/api/v1/penduduk/${id}/riwayat`, kuki.operator)).json())
const pendudukDari = async (id: string) => pendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/${id}`, kuki.operator)).json())
const hitung = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Penduduk Hidup di Dusun I dengan pekerjaan terisi, bukan Wiraswasta dan bukan tokoh uji lain; tiap uji memakai orangnya sendiri. */
const calon = (): DbDemo['penduduk'] => dunia.penduduk.filter(
  (p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Hidup' && p.dusunId === 'dsn_ss_1' && p.pekerjaan !== null && p.pekerjaan !== 'Wiraswasta' && !p.id.startsWith('pdk_syahrial'),
)
const orang = (n: number) => calon()[n] as NonNullable<DbDemo['penduduk'][number]>

async function sisipLaporan(id: string, o: { isi: IsiLaporan; dusunId?: string; dibuat?: Date }): Promise<void> {
  const isi = sandikanIsiLaporan(penyandi, ID_SUNGAI_SIALANG, o.isi)
  await uji.sqlMigrasi`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, isi)
    values (${id}, ${ID_SUNGAI_SIALANG}, ${o.dusunId ?? 'dsn_ss_1'}, ${o.dibuat ?? new Date('2026-09-24T01:30:00Z')}, 'pdk_siti_rahmah', 'Siti Rahmah', 'baru', ${uji.sqlMigrasi.json(isi as never)})`
}
const perbaikan = (pendudukId: string, field: 'pekerjaan' | 'telepon' | 'nama' | 'tanggalLahir', nilaiBaru: string): IsiLaporan => ({ jenis: 'perbaikan', pendudukId, field, nilaiBaru, catatan: null })

describe('GET /laporan-data dan /laporan-data/:id (SPEC-V0.2 §5.3, §6.3)', () => {
  it('laporan baru terlama dulu, sama dengan dunia demo; saringan jenis dan penduduk; tanpa halaman', async () => {
    const r = await daftar('?status=baru')
    expect(r.status).toBe(200)
    const isi = skemaDaftar.parse(await r.json())
    expect(isi.data.map((l) => l.id)).toEqual(['lap_pekerjaan_syahrial', 'lap_kelahiran_rosnani'])
    expect(isi.data).toEqual([...dunia.laporanData].sort((a, b) => a.dibuatPada.localeCompare(b.dibuatPada)))
    expect(isi.meta).toEqual({ page: 1, pageSize: 2, total: 2 })
    expect(skemaDaftar.parse(await (await daftar('?jenis=perbaikan&pendudukId=pdk_syahrial')).json()).data).toHaveLength(1)
    const kosong = skemaDaftar.parse(await (await daftar('?pendudukId=pdk_siti_rahmah')).json())
    expect(kosong.data).toEqual([])
    expect(kosong.meta).toEqual({ page: 1, pageSize: 1, total: 0 })
    expect((await daftar('?status=selesai')).status).toBe(422)
    expect((await galat(await daftar('?status=selesai'))).message).toBe('Filter tidak valid.')
  })

  it('detail sama dengan dunia demo; id tak dikenal dan desa lain 404 Laporan tidak ditemukan.', async () => {
    const r = await detail('lap_pekerjaan_syahrial')
    expect(laporanDataSchema.parse(await r.json())).toEqual(dunia.laporanData.find((l) => l.id === 'lap_pekerjaan_syahrial'))
    for (const hasil of [await detail('lap_tidak_ada'), await detail('lap_pekerjaan_syahrial', kuki.yusri, TL)]) {
      expect(hasil.status).toBe(404)
      expect(await galat(hasil)).toMatchObject({ code: 'NOT_FOUND', message: 'Laporan tidak ditemukan.' })
    }
    expect(skemaDaftar.parse(await (await daftar('', kuki.yusri, TL)).json()).meta.total).toBe(0)
  })

  it('Kepala Dusun II tidak melihat laporan dusun lain, tetapi melihat laporan dusunnya', async () => {
    expect(skemaDaftar.parse(await (await daftar('', kuki.kadus)).json()).data).toEqual([])
    expect((await detail('lap_pekerjaan_syahrial', kuki.kadus)).status).toBe(404)
    const warga2 = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.dusunId === 'dsn_ss_2' && p.statusDasar === 'Hidup' && p.pekerjaan !== null) as NonNullable<DbDemo['penduduk'][number]>
    await sisipLaporan('lap_dusun2', { isi: perbaikan(warga2.id, 'pekerjaan', 'Wiraswasta'), dusunId: 'dsn_ss_2' })
    expect(skemaDaftar.parse(await (await daftar('', kuki.kadus)).json()).data.map((l) => l.id)).toEqual(['lap_dusun2'])
    expect((await detail('lap_dusun2', kuki.kadus)).status).toBe(200)
    expect(skemaDaftar.parse(await (await daftar('', kuki.operator)).json()).data.map((l) => l.id)).toContain('lap_dusun2')
  })

  it('Kaur Keuangan 403 dengan pesan tiruan, tanpa cookie 401', async () => {
    for (const f of [() => daftar('', kuki.kaur), () => detail('lap_pekerjaan_syahrial', kuki.kaur)]) {
      const r = await f()
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_LIHAT)
    }
    expect((await daftar('', null)).status).toBe(401)
  })
})

describe('POST /laporan-data/:id/terapkan', () => {
  it('data berubah, Riwayat mencatat petugas, laporan selesai, aktivitas laporan-diterapkan; terapkan lagi 409', async () => {
    const r = await terapkan('lap_pekerjaan_syahrial')
    expect(r.status).toBe(200)
    const { laporan, penduduk } = hasilTerapkanSchema.parse(await r.json())
    expect(penduduk).toMatchObject({ id: 'pdk_syahrial', pekerjaan: 'Wiraswasta' })
    expect(laporan).toMatchObject({ id: 'lap_pekerjaan_syahrial', status: 'diterapkan', ditangani: { oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, alasan: null } })
    expect(await riwayatDari('pdk_syahrial')).toContainEqual(
      expect.objectContaining({ jenis: 'ubah', field: 'pekerjaan', nilaiLama: 'Nelayan/Perikanan', nilaiBaru: 'Wiraswasta', oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } }),
    )
    const akt = await uji.sqlMigrasi`select jenis, ringkasan, rujukan_jenis, rujukan_id, oleh_id from aktivitas where rujukan_id = 'pdk_syahrial' and jenis in ('laporan-diterapkan', 'penduduk-ubah')`
    expect(akt).toHaveLength(1)
    expect(akt[0]).toMatchObject({ jenis: 'laporan-diterapkan', ringkasan: 'Laporan warga diterapkan · Syahrial (Pekerjaan)', rujukan_jenis: 'penduduk', oleh_id: 'pgn_rosmiati' })
    expect(laporanDataSchema.parse(await (await detail('lap_pekerjaan_syahrial')).json()).status).toBe('diterapkan')
    const lagi = await terapkan('lap_pekerjaan_syahrial')
    expect(lagi.status).toBe(409)
    expect(await galat(lagi)).toMatchObject({ code: 'CONFLICT', message: 'Laporan ini sudah ditangani.' })
    expect((await riwayatDari('pdk_syahrial')).filter((e) => e.jenis === 'ubah' && e.field === 'pekerjaan' && e.nilaiBaru === 'Wiraswasta')).toHaveLength(1)
  })

  it('nilai sama dengan data sekarang: laporan selesai tanpa entri Riwayat', async () => {
    const p = orang(0)
    await sisipLaporan('lap_sama', { isi: perbaikan(p.id, 'pekerjaan', p.pekerjaan as string) })
    const sebelum = await hitung('riwayat_penduduk', `penduduk_id = '${p.id}'`)
    const r = await terapkan('lap_sama')
    expect(r.status).toBe(200)
    expect(hasilTerapkanSchema.parse(await r.json()).laporan.status).toBe('diterapkan')
    expect(await hitung('riwayat_penduduk', `penduduk_id = '${p.id}'`)).toBe(sebelum)
  })

  it('nilai yang tak lolos skema: 422 dengan pesan yang bisa ditindaklanjuti; laporan tetap baru dan data tidak berubah', async () => {
    const p = orang(1)
    await sisipLaporan('lap_rusak', { isi: perbaikan(p.id, 'pekerjaan', 'Pekerjaan karangan') })
    const r = await terapkan('lap_rusak')
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toBe('Nilai yang dilaporkan tidak valid untuk pekerjaan. Tolak laporan ini, atau ubah datanya lewat Ubah.')
    expect(laporanDataSchema.parse(await (await detail('lap_rusak')).json()).status).toBe('baru')
    expect((await pendudukDari(p.id)).pekerjaan).toBe(p.pekerjaan)
  })

  it('laporan kelahiran tidak bisa diterapkan langsung; penduduk yang hilang 404', async () => {
    const lewat = await terapkan('lap_kelahiran_rosnani')
    expect(lewat.status).toBe(422)
    expect((await galat(lewat)).message).toBe('Laporan kelahiran dicatat lewat alur Catat kelahiran.')
    await sisipLaporan('lap_hilang', { isi: perbaikan('pdk_tidak_ada', 'pekerjaan', 'Wiraswasta') })
    const hilang = await terapkan('lap_hilang')
    expect(hilang.status).toBe(404)
    expect((await galat(hilang)).message).toBe('Data penduduk tidak ditemukan.')
    expect((await terapkan('lap_tidak_ada')).status).toBe(404)
  })

  it('telepon: tersimpan sebagai sandi di laporan, riwayat, dan penduduk; jawaban membuka nilainya (Ruling 4)', async () => {
    const p = orang(2)
    const nomor = '081377700099'
    await sisipLaporan('lap_telepon', { isi: perbaikan(p.id, 'telepon', nomor) })
    const [mentah] = await uji.sqlMigrasi`select isi::text as teks from laporan_data where id = 'lap_telepon'`
    expect(mentah.teks.includes(nomor)).toBe(false)
    expect(laporanDataSchema.parse(await (await detail('lap_telepon')).json()).isi).toMatchObject({ field: 'telepon', nilaiBaru: nomor })
    const r = await terapkan('lap_telepon')
    expect(r.status).toBe(200)
    expect(hasilTerapkanSchema.parse(await r.json()).penduduk.telepon).toBe(nomor)
    const [baris] = await uji.sqlMigrasi`select telepon_sandi from penduduk where id = ${p.id}`
    expect(baris.telepon_sandi).toMatch(/^v1\./)
    const rw = await uji.sqlMigrasi`select nilai_baru from riwayat_penduduk where penduduk_id = ${p.id} and field = 'telepon' order by waktu desc limit 1`
    expect(rw[0].nilai_baru).toMatch(/^v1\./)
    expect(await riwayatDari(p.id)).toContainEqual(expect.objectContaining({ jenis: 'ubah', field: 'telepon', nilaiBaru: nomor }))
  })

  it('Kades 403 dan tanpa cookie 401; Kepala Dusun 403; sekdes boleh', async () => {
    for (const k of [kuki.kades, kuki.kadus, kuki.kaur]) {
      const r = await terapkan('lap_dusun2', k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_UBAH)
    }
    expect((await terapkan('lap_dusun2', null)).status).toBe(401)
    expect(laporanDataSchema.parse(await (await detail('lap_dusun2')).json()).status).toBe('baru')
    expect((await terapkan('lap_dusun2', kuki.sekdes)).status).toBe(200)
  })

  it('dua terapkan serentak: satu 200, satu 409, hanya satu entri Riwayat (fokus 5)', async () => {
    const p = orang(3)
    await sisipLaporan('lap_serentak', { isi: perbaikan(p.id, 'nama', 'Nama Hasil Laporan') })
    const [a, b] = await Promise.all([terapkan('lap_serentak'), terapkan('lap_serentak')])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect(await hitung('riwayat_penduduk', `penduduk_id = '${p.id}' and field = 'nama'`)).toBe(1)
  })

  it('terapkan membaca status laporan SESUDAH mengunci barisnya (bukti deterministik, fokus 5)', async () => {
    const p = orang(4)
    await sisipLaporan('lap_kunci', { isi: perbaikan(p.id, 'nama', 'Nama Tak Boleh Terpasang') })
    let selesai = false
    let hasil: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`update laporan_data set status = 'diterapkan', ditangani_oleh_id = 'pgn_lain', ditangani_oleh_nama = 'Lain', ditangani_pada = now() where id = 'lap_kunci'`
      hasil = terapkan('lap_kunci').then((r) => {
        selesai = true
        return r
      })
      await tunggu(500)
      expect(selesai).toBe(false)
    })
    expect((await hasil)?.status).toBe(409)
    expect((await pendudukDari(p.id)).nama).toBe(p.nama)
    expect(await hitung('riwayat_penduduk', `penduduk_id = '${p.id}'`)).toBe(0)
  })

  it('kegagalan mencatat aktivitas membatalkan data, Riwayat, dan status laporan (fokus 6)', async () => {
    const p = orang(5)
    await sisipLaporan('lap_atomik', { isi: perbaikan(p.id, 'pekerjaan', 'Wiraswasta') })
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_aktivitas3() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_aktivitas3() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal3 before insert on aktivitas for each row execute function uji_gagal_aktivitas3()')
    try {
      expect((await terapkan('lap_atomik')).status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal3 on aktivitas')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_aktivitas3()')
    }
    expect(laporanDataSchema.parse(await (await detail('lap_atomik')).json()).status).toBe('baru')
    expect((await pendudukDari(p.id)).pekerjaan).toBe(p.pekerjaan)
    expect(await hitung('riwayat_penduduk', `penduduk_id = '${p.id}'`)).toBe(0)
  })
})

describe('POST /laporan-data/:id/tolak', () => {
  it('dengan alasan: laporan ditolak, aktivitas laporan-ditolak, data tidak berubah, tidak bisa diterapkan sesudahnya', async () => {
    const r = await tolak('lap_dusun2', { alasan: 'x' }, kuki.sekdes)
    expect(r.status).toBe(409)
    const p = orang(6)
    await sisipLaporan('lap_tolak', { isi: perbaikan(p.id, 'pekerjaan', 'Wiraswasta') })
    const t = await tolak('lap_tolak', { alasan: '  Masih tercatat di kelompok nelayan.  ' }, kuki.sekdes)
    expect(t.status).toBe(200)
    const { laporan } = z2(await t.json())
    expect(laporan).toMatchObject({ status: 'ditolak', ditangani: { oleh: { id: 'pgn_hendri', nama: 'Hendri Saputra' }, alasan: 'Masih tercatat di kelompok nelayan.' } })
    const akt = await uji.sqlMigrasi`select ringkasan, rujukan_jenis, rujukan_id from aktivitas where jenis = 'laporan-ditolak' and rujukan_id = ${p.id}`
    expect(akt[0]).toMatchObject({ ringkasan: `Laporan warga ditolak · ${p.nama}`, rujukan_jenis: 'penduduk' })
    const lagi = await terapkan('lap_tolak')
    expect(lagi.status).toBe(409)
    expect((await galat(lagi)).message).toBe('Laporan ini sudah ditangani.')
    expect((await tolak('lap_tolak', { alasan: null })).status).toBe(409)
    expect((await pendudukDari(p.id)).pekerjaan).toBe(p.pekerjaan)
  })

  it('alasan kosong atau null menjadi null; kelahiran ditolak tanpa rujukan penduduk', async () => {
    const t = await tolak('lap_kelahiran_rosnani', { alasan: '   ' })
    expect(t.status).toBe(200)
    expect(z2(await t.json()).laporan.ditangani?.alasan).toBeNull()
    const akt = await uji.sqlMigrasi`select ringkasan, rujukan_jenis, rujukan_id from aktivitas where jenis = 'laporan-ditolak' and ringkasan like '%kelahiran Nayla Safitri'`
    expect(akt).toHaveLength(1)
    expect(akt[0]).toMatchObject({ ringkasan: 'Laporan warga ditolak · kelahiran Nayla Safitri', rujukan_jenis: null, rujukan_id: null })
    const p = orang(7)
    await sisipLaporan('lap_tolak_null', { isi: perbaikan(p.id, 'pekerjaan', 'Wiraswasta') })
    expect(z2(await (await tolak('lap_tolak_null', { alasan: null })).json()).laporan.ditangani?.alasan).toBeNull()
  })

  it('masukan tidak valid 422; laporan tak dikenal 404; Kades 403 dan tanpa cookie 401', async () => {
    const p = orang(8)
    await sisipLaporan('lap_tolak_rusak', { isi: perbaikan(p.id, 'pekerjaan', 'Wiraswasta') })
    for (const badan of [{ alasan: 'a'.repeat(301) }, {}, { alasan: 12 }]) {
      const r = await tolak('lap_tolak_rusak', badan)
      expect(r.status).toBe(422)
      expect((await galat(r)).message).toBe('Isian belum lengkap atau tidak valid.')
    }
    expect((await tolak('lap_tidak_ada', { alasan: null })).status).toBe(404)
    const kades = await tolak('lap_tolak_rusak', { alasan: null }, kuki.kades)
    expect(kades.status).toBe(403)
    expect((await galat(kades)).message).toBe(PESAN_UBAH)
    expect((await tolak('lap_tolak_rusak', { alasan: null }, null)).status).toBe(401)
    expect(laporanDataSchema.parse(await (await detail('lap_tolak_rusak')).json()).status).toBe('baru')
  })
})
