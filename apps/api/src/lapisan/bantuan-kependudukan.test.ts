import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { badanGalat } from '../galat'
import { JALUR_CARI_BACA, PESAN_CARI_NOMOR, PESAN_LIHAT_SAJA, samarkanDataPribadi } from './bantuan'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)
const NIK_SITI = '1405095203918002'
const NIK_SITI_BERKELOMPOK = '140509 520391 8002'
const NIK_LAIN_BERKELOMPOK = '140509 520391 8003'
const NOMOR16_UTUH = /(?<!\d)\d{16}(?!\d)/
const NIK_BERKELOMPOK = /(?<!\d)\d{6} \d{6} \d{4}(?!\d)/
const TERSAMAR = /^\d{4}•{8}\d{4}$/

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
beforeAll(async () => {
  uji = await buatDbUji()
  const penyandi = await penyandiUji(uji.sqlMigrasi)
  const sandi = (nilai: string): string => penyandi.sandikan(nilai, `riwayat_penduduk.nilai:${DESA_SS}`)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  await uji.sqlMigrasi`insert into riwayat_penduduk (id, desa_id, penduduk_id, field, nilai_lama, nilai_baru, oleh_id, oleh_nama, waktu)
    values ('rwy_nik_uji', ${DESA_SS}, 'pdk_siti_rahmah', 'nik', ${sandi(NIK_SITI_BERKELOMPOK)}, ${sandi(NIK_LAIN_BERKELOMPOK)}, 'pgn_rosmiati', 'Rosmiati', ${lewat(-2 * JAM)})`
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
const jejak = async (): Promise<string[]> => (await uji.sqlMigrasi`select jalur from jejak_bantuan order by urut`).map((b) => b.jalur as string)
const hitung = async (tabel: string): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n)

describe('sesi bantuan membaca rute kependudukan dengan penyamaran menyala (rencana 8E1 Tugas 7)', () => {
  it('detail penduduk, daftar dan detail KK: NIK dan nomor KK tersamar, tidak ada 16 angka utuh', async () => {
    const sesi = await siapkan(true)
    const detail = await kirim('GET', '/penduduk/pdk_siti_rahmah', sesi.kuki)
    expect(detail.status).toBe(200)
    expect(((await detail.json()) as { nik: string }).nik).toMatch(TERSAMAR)

    const kk = await kirim('GET', '/keluarga/kk_syahrial', sesi.kuki)
    expect(kk.status).toBe(200)
    const teksKk = JSON.stringify(await kk.json())
    expect(teksKk).not.toMatch(NOMOR16_UTUH)
    expect(teksKk).toContain('1405••••••••8004')

    const daftar = await kirim('GET', '/keluarga?pageSize=100', sesi.kuki)
    expect(daftar.status).toBe(200)
    const baris = ((await daftar.json()) as { data: { nomorKk: string }[] }).data
    expect(baris.length).toBeGreaterThan(0)
    for (const b of baris) expect(b.nomorKk).toMatch(TERSAMAR)

    // Pengaturan desa bukan bagian dari peran bantuan (tanpa `pengaturan.kelola`): ditolak oleh hak peran, bukan oleh lapisan.
    const wilayah = await kirim('GET', '/pengaturan/wilayah', sesi.kuki)
    expect(wilayah.status).toBe(403)
    expect(await wilayah.json()).toEqual(badanGalat('FORBIDDEN', 'Peran Anda tidak berhak membuka Pengaturan desa.'))
  })

  it('riwayat: NIK yang tercatat berkelompok ("140509 520391 8002") ikut tersamar (celah 16 angka berurutan)', async () => {
    const sesi = await siapkan(true)
    const r = await kirim('GET', '/penduduk/pdk_siti_rahmah/riwayat', sesi.kuki)
    expect(r.status).toBe(200)
    const teks = JSON.stringify(await r.json())
    expect(teks).not.toMatch(NIK_BERKELOMPOK)
    expect(teks).not.toMatch(NOMOR16_UTUH)
    expect(teks).toContain('1405••••••••8002')
    expect(teks).toContain('1405••••••••8003')
  })

  it('setiap halaman yang terbuka tercatat di jejak bantuan tanpa NIK di jalurnya; yang ditolak hak peran tidak membuka apa pun dan tidak tercatat', async () => {
    const sesi = await siapkan(true)
    await kirim('GET', '/penduduk/pdk_siti_rahmah', sesi.kuki)
    await kirim('GET', '/keluarga/kk_syahrial', sesi.kuki)
    await kirim('GET', '/penduduk/pdk_siti_rahmah/riwayat', sesi.kuki)
    await kirim('GET', '/pengaturan/wilayah', sesi.kuki)
    expect(await jejak()).toEqual(['/penduduk/pdk_siti_rahmah', '/keluarga/kk_syahrial', '/penduduk/pdk_siti_rahmah/riwayat'])
  })

  it('pencarian KK lewat POST: angka lima berurutan ditolak, nama diizinkan dan hasilnya tersamar', async () => {
    const sesi = await siapkan(true)
    for (const kata of ['12345', '1405092011238004', '140509 201123']) {
      const r = await kirim('POST', '/keluarga/cari', sesi.kuki, { kata, filter: {} })
      expect(r.status, kata).toBe(403)
      expect(await r.json()).toEqual(badanGalat('FORBIDDEN', PESAN_CARI_NOMOR))
    }
    const nama = await kirim('POST', '/keluarga/cari', sesi.kuki, { kata: 'Syahrial', filter: {} })
    expect(nama.status).toBe(200)
    const teks = JSON.stringify(await nama.json())
    expect(teks).toContain('Syahrial')
    expect(teks).not.toMatch(NOMOR16_UTUH)
  })
})

describe('sesi bantuan tidak pernah menulis (rencana 8E1 Tugas 7)', () => {
  it('semua tulis kependudukan dan wilayah ditolak 403 dan tidak mengubah satu baris pun', async () => {
    const sesi = await siapkan(true)
    const tabel = ['penduduk', 'keluarga', 'dusun', 'riwayat_penduduk', 'aktivitas', 'jejak_audit']
    const sebelum = await Promise.all(tabel.map(hitung))
    const biodata = { nik: '1405091005159999', nama: 'Uji', keluarga: { jenis: 'ada', id: 'kk_syahrial' } }
    const percobaan: [string, string, unknown][] = [
      ['POST', '/penduduk', biodata],
      ['PATCH', '/penduduk/pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' }],
      ['POST', '/penduduk/cek-nik', { nik: NIK_SITI }],
      ['POST', '/penduduk/ekspor', { kata: null, filter: {}, format: 'csv' }],
      ['POST', '/keluarga/kk_syahrial/ganti-kepala', { kepalaBaruId: 'pdk_siti_rahmah', hubunganKepalaLama: 'Suami' }],
      ['POST', '/keluarga/kk_syahrial/pecah', { anggotaIds: ['pdk_siti_rahmah'], kepalaBaruId: 'pdk_siti_rahmah', dusunId: 'dsn_ss_1', rw: '002', rt: '004' }],
      ['PUT', '/pengaturan/wilayah', { istilah: { dusun: 'Jorong', rw: 'RW', rt: 'RT' }, dusun: [] }],
    ]
    for (const [metode, jalur, badan] of percobaan) {
      const r = await kirim(metode, jalur, sesi.kuki, badan)
      expect(r.status, `${metode} ${jalur}`).toBe(403)
      expect(await r.json(), `${metode} ${jalur}`).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))
    }
    expect(await Promise.all(tabel.map(hitung))).toEqual(sebelum)
    expect(await jejak()).toEqual([])
  })

  it('daftar pencarian-baca tepat empat jalur: /cari, /penduduk/cari, /keluarga/cari, dan /permohonan/cari (8F2a)', () => {
    expect([...JALUR_CARI_BACA]).toEqual(['/cari', '/penduduk/cari', '/keluarga/cari', '/permohonan/cari'])
  })
})

describe('penyamaran dimatikan desa (rencana 8E1 Tugas 7)', () => {
  it('NIK utuh di detail, riwayat, dan KK, dan pencarian angka diizinkan', async () => {
    const sesi = await siapkan(false)
    expect(((await (await kirim('GET', '/penduduk/pdk_siti_rahmah', sesi.kuki)).json()) as { nik: string }).nik).toBe(NIK_SITI)
    expect(JSON.stringify(await (await kirim('GET', '/penduduk/pdk_siti_rahmah/riwayat', sesi.kuki)).json())).toContain(NIK_SITI_BERKELOMPOK)
    expect(JSON.stringify(await (await kirim('GET', '/keluarga/kk_syahrial', sesi.kuki)).json())).toMatch(NOMOR16_UTUH)
    const cari = await kirim('POST', '/keluarga/cari', sesi.kuki, { kata: '1405092011238004', filter: {} })
    expect(cari.status).toBe(200)
    expect(((await cari.json()) as { data: unknown[] }).data).toHaveLength(1)
  })
})

describe('samarkanDataPribadi: NIK berkelompok', () => {
  it('menyamarkan 6-6-4 di tengah kalimat dan di dalam struktur, tanpa menyentuh angka lain', () => {
    expect(samarkanDataPribadi('NIK diubah dari 140509 520391 8002 menjadi 140509 520391 8003')).toBe('NIK diubah dari 1405••••••••8002 menjadi 1405••••••••8003')
    expect(samarkanDataPribadi({ a: [{ nilaiLama: '140509 520391 8002' }], b: 'Kode 140509 52039 8002' })).toEqual({ a: [{ nilaiLama: '1405••••••••8002' }], b: 'Kode 140509 52039 8002' })
    expect(samarkanDataPribadi('1 140509 520391 80021')).toBe('1 140509 520391 80021')
    expect(samarkanDataPribadi('081234567890 dan 12 Januari 2026')).toBe('081234567890 dan 12 Januari 2026')
  })
})
