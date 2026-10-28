import { bangkitkanDb } from '@sinfodes/demo/generator'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { sandikanIsiLaporan } from '../modul/laporan/sandi'
import { badanGalat } from '../galat'
import { JALUR_CARI_BACA, PESAN_LIHAT_SAJA } from './bantuan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)
const NIK_SITI = '1405095203918002'
const NOMOR16_UTUH = /(?<!\d)\d{16}(?!\d)/
const TERSAMAR = /^\d{4}•{8}\d{4}$/
const TELEPON_BARU = '081377700123'

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
beforeAll(async () => {
  uji = await buatDbUji()
  const penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const isiTelepon = sandikanIsiLaporan(penyandi, DESA_SS, { jenis: 'perbaikan', pendudukId: 'pdk_siti_rahmah', field: 'telepon', nilaiBaru: TELEPON_BARU, catatan: null })
  const isiCatatan = { jenis: 'perbaikan', pendudukId: 'pdk_syahrial', field: 'nama', nilaiBaru: 'Syahrial Putra', catatan: `NIK saya ${NIK_SITI} dan istri 140509 520391 8002.` }
  await uji.sqlMigrasi`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, isi) values
    ('lap_uji_telepon', ${DESA_SS}, 'dsn_ss_1', ${lewat(-3 * JAM)}, 'pdk_siti_rahmah', 'Siti Rahmah', 'baru', ${uji.sqlMigrasi.json(isiTelepon as never)}),
    ('lap_uji_catatan', ${DESA_SS}, 'dsn_ss_1', ${lewat(-2 * JAM)}, 'pdk_siti_rahmah', 'Siti Rahmah', 'baru', ${uji.sqlMigrasi.json(isiCatatan as never)})`
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from jejak_bantuan`
  await uji.sqlMigrasi`delete from sesi_bantuan`
  await uji.sqlMigrasi`delete from akses_bantuan`
})

const siapkan = async (sembunyikan: boolean) => {
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM), sembunyikan })
  return sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: DESA_SS, aksesId: akses.id, dibuat: lewat(-10 * MENIT), olehNama: 'Dina Uji' })
}
const kirim = (metode: string, jalur: string, kuki: string, badan?: unknown) =>
  app.fetch(
    new Request(`${SS}/api/v1${jalur}`, {
      method: metode,
      headers: { 'Content-Type': 'application/json', Origin: SS, Cookie: kuki },
      ...(badan === undefined ? {} : { body: JSON.stringify(badan) }),
    }),
  )
const jejak = async (): Promise<string[]> => (await uji.sqlMigrasi`select jalur from jejak_bantuan order by urut`).map((b) => (b.jalur as string).split('?')[0])
const hitung = async (tabel: string): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n)

describe('sesi bantuan membaca mutasi dan laporan data dengan penyamaran menyala (rencana 8E2 Tugas 6)', () => {
  it('Buku Mutasi, ringkasan, dan Riwayat penduduk terbaca tanpa 16 angka utuh; setiap halaman tercatat di jejak bantuan', async () => {
    const sesi = await siapkan(true)
    const mutasi = await kirim('GET', '/mutasi?pageSize=100', sesi.kuki)
    expect(mutasi.status).toBe(200)
    expect(((await mutasi.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0)
    const ringkasan = await kirim('GET', '/mutasi/ringkasan?bulan=2026-09', sesi.kuki)
    expect(ringkasan.status).toBe(200)
    const bayi = bangkitkanDb(SEKARANG_UJI).mutasi.find((m) => m.desaId === DESA_SS && m.jenis === 'lahir')
    const riwayat = await kirim('GET', `/penduduk/${bayi?.pendudukIds[0]}/riwayat`, sesi.kuki)
    expect(riwayat.status).toBe(200)
    expect(JSON.stringify(await riwayat.json())).toContain('"jenis":"mutasi"')
    expect(await jejak()).toEqual(['/mutasi', '/mutasi/ringkasan', `/penduduk/${bayi?.pendudukIds[0]}/riwayat`])
  })

  it('laporan data: catatan warga yang memuat NIK (polos maupun berkelompok) tersamar di daftar dan detail', async () => {
    const sesi = await siapkan(true)
    const daftar = await kirim('GET', '/laporan-data', sesi.kuki)
    expect(daftar.status).toBe(200)
    const teksDaftar = JSON.stringify(await daftar.json())
    expect(teksDaftar).not.toMatch(NOMOR16_UTUH)
    expect(teksDaftar).not.toMatch(/(?<!\d)\d{6} \d{6} \d{4}(?!\d)/)
    expect(teksDaftar).toContain('1405••••••••8002')
    const detail = await kirim('GET', '/laporan-data/lap_uji_catatan', sesi.kuki)
    expect(detail.status).toBe(200)
    const isi = (await detail.json()) as { isi: { catatan: string } }
    expect(isi.isi.catatan).toBe('NIK saya 1405••••••••8002 dan istri 1405••••••••8002.')
    expect(await jejak()).toEqual(['/laporan-data', '/laporan-data/lap_uji_catatan'])
  })

  it('penyamaran mati: catatan utuh', async () => {
    const sesi = await siapkan(false)
    const isi = (await (await kirim('GET', '/laporan-data/lap_uji_catatan', sesi.kuki)).json()) as { isi: { catatan: string } }
    expect(isi.isi.catatan).toContain(NIK_SITI)
  })

  it('preset pendatang lewat pencarian POST berjalan tersamar', async () => {
    const sesi = await siapkan(true)
    const dunia = bangkitkanDb(SEKARANG_UJI)
    const idPendatang = new Set(dunia.mutasi.filter((m) => m.desaId === DESA_SS && m.jenis === 'datang' && m.tanggal.startsWith('2026')).flatMap((m) => m.pendudukIds))
    const kata = (dunia.penduduk.find((p) => idPendatang.has(p.id)) as { nama: string }).nama.split(' ')[0]
    const r = await kirim('POST', '/penduduk/cari', sesi.kuki, { kata, filter: { preset: 'pendatang-tahun-ini', pageSize: 100 } })
    expect(r.status).toBe(200)
    const baris = ((await r.json()) as { data: { nik: string | null }[] }).data
    expect(baris.length).toBeGreaterThan(0)
    for (const b of baris) expect(b.nik).toMatch(TERSAMAR)
  })

  it('penguncian perilaku: nilai telepon pada laporan tidak disamarkan, sama dengan telepon di detail penduduk (keputusan penyamaran telepon, bila ada, di 8K)', async () => {
    const sesi = await siapkan(true)
    const detail = (await (await kirim('GET', '/laporan-data/lap_uji_telepon', sesi.kuki)).json()) as { isi: { nilaiBaru: string } }
    expect(detail.isi.nilaiBaru).toBe(TELEPON_BARU)
    const siti = bangkitkanDb(SEKARANG_UJI).penduduk.find((p) => p.id === 'pdk_siti_rahmah')
    const penduduk = (await (await kirim('GET', '/penduduk/pdk_siti_rahmah', sesi.kuki)).json()) as { telepon: string | null }
    expect(penduduk.telepon).toBe(siti?.telepon ?? null)
  })
})

describe('sesi bantuan tidak pernah menulis mutasi dan laporan (rencana 8E2 Tugas 6)', () => {
  it('semua POST mutasi dan penanganan laporan ditolak 403 dan tidak mengubah satu baris pun', async () => {
    const sesi = await siapkan(true)
    const tabel = ['mutasi', 'mutasi_penduduk', 'penduduk', 'keluarga', 'riwayat_penduduk', 'aktivitas', 'jejak_audit']
    const sebelum = await Promise.all(tabel.map(hitung))
    const status = async () => (await uji.sqlMigrasi`select id, status from laporan_data order by id`).map((b) => `${b.id}:${b.status}`)
    const statusSebelum = await status()
    const percobaan: [string, string, unknown][] = [
      ['POST', '/mutasi/lahir', { ibuId: 'pdk_siti_rahmah', ayahId: null, pelapor: 'X', bayi: { nama: 'Uji' } }],
      ['POST', '/mutasi/meninggal', { pendudukId: 'pdk_syahrial', tanggal: '2026-09-23', penggantiKepalaId: 'pdk_siti_rahmah' }],
      ['POST', '/mutasi/pindah', { pendudukIds: ['pdk_nur_aini'], tanggal: '2026-09-22' }],
      ['POST', '/mutasi/datang', { nomorSkpwni: 'X', tanggal: '2026-09-22', anggota: [] }],
      ['POST', '/laporan-data/lap_pekerjaan_syahrial/terapkan', {}],
      ['POST', '/laporan-data/lap_pekerjaan_syahrial/tolak', { alasan: null }],
    ]
    for (const [metode, jalur, badan] of percobaan) {
      const r = await kirim(metode, jalur, sesi.kuki, badan)
      expect(r.status, `${metode} ${jalur}`).toBe(403)
      expect(await r.json(), `${metode} ${jalur}`).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))
    }
    expect(await Promise.all(tabel.map(hitung))).toEqual(sebelum)
    expect(await status()).toEqual(statusSebelum)
    expect(await jejak()).toEqual([])
  })

  it('daftar pencarian-baca tetap tepat dua jalur: tidak ada rute mutasi atau laporan yang ikut', () => {
    expect([...JALUR_CARI_BACA]).toEqual(['/penduduk/cari', '/keluarga/cari'])
  })
})
