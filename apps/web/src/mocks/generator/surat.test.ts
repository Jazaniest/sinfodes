import { beforeAll, describe, expect, it } from 'vitest'
import { keWaktuWib, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { jenisSuratSchema } from '@/domain/surat/jenis'
import { permohonanSchema, type StatusPermohonan } from '@/domain/surat/permohonan'
import { hariKerjaBerlalu } from '@/domain/surat/waktu'
import type { DbDemo } from '../tipe-db'
import { bangkitkanDb } from './index'
import { ANTREAN_SURAT } from './surat'

// Kamis, 24 September 2026 pukul 09.00 WIB.
const SEKARANG = new Date('2026-09-24T02:00:00Z')
const HARI_MS = 86_400_000
let db: DbDemo

beforeAll(() => {
  db = bangkitkanDb(SEKARANG)
})

const status = (s: StatusPermohonan) => db.permohonan.filter((p) => p.status === s)

describe('data surat demo (SPEC §12.6)', () => {
  it('12 jenis surat untuk Sungai Sialang; pengaturan surat bawaan untuk setiap desa', () => {
    expect(db.jenisSurat.filter((j) => j.desaId === 'desa_sungai_sialang').map((j) => j.id)).toEqual([
      'js_ss_skd', 'js_ss_sktm', 'js_ss_sku', 'js_ss_spck', 'js_ss_skl', 'js_ss_skm',
      'js_ss_spp', 'js_ss_skp', 'js_ss_spn', 'js_ss_skbn', 'js_ss_skbm', 'js_ss_skh',
    ])
    for (const j of db.jenisSurat) expect(jenisSuratSchema.safeParse(j).success, j.id).toBe(true)
    // Tanjung Lamo (Persiapan) memulai dengan katalog bawaan yang belum dilayani (tahap 6C).
    const katalogBaru = db.jenisSurat.filter((j) => j.desaId === 'desa_tanjung_lamo')
    expect(katalogBaru.map((j) => j.id.replace('js_tanjung_lamo_', 'js_ss_'))).toEqual(
      db.jenisSurat.filter((j) => j.desaId === 'desa_sungai_sialang').map((j) => j.id),
    )
    expect(katalogBaru.every((j) => !j.aktif)).toBe(true)
    expect(db.pengaturanSurat.map((p) => [p.desaId, p.tataLetak.kertas.ukuran, p.modeTandaTangan])).toEqual([
      ['desa_sungai_sialang', 'A4', 'tte'],
      ['desa_tanjung_lamo', 'A4', 'tte'],
    ])
  })
  it('semua permohonan lolos skema; sekitar 65 per 30 hari selama 12 bulan', () => {
    for (const p of db.permohonan) expect(permohonanSchema.safeParse(p).success, p.id).toBe(true)
    const batas30 = waktuIsoWib(new Date(SEKARANG.getTime() - 30 * HARI_MS))
    const sebulan = db.permohonan.filter((p) => p.masukPada >= batas30).length
    expect(sebulan).toBeGreaterThanOrEqual(50)
    expect(sebulan).toBeLessThanOrEqual(85)
    expect(db.permohonan.length).toBeGreaterThanOrEqual(650)
    expect(db.permohonan.length).toBeLessThanOrEqual(950)
  })
  it('antrean: 7 menunggu, 5 diproses (1 dikembalikan), 3 perlu TTD (1 di tahap paraf)', () => {
    expect(status('menunggu')).toHaveLength(ANTREAN_SURAT.menunggu)
    expect(status('diproses')).toHaveLength(ANTREAN_SURAT.diproses)
    expect(status('perlu-ttd')).toHaveLength(ANTREAN_SURAT['perlu-ttd'])
    const paraf = status('perlu-ttd').filter((p) => p.tahap === 'paraf')
    expect(paraf).toHaveLength(1)
    expect(db.jenisSurat.find((j) => j.id === paraf[0].jenisId)?.wajibParaf).toBe(true)
    const kembali = status('diproses').filter((p) => p.dikembalikan !== null)
    expect(kembali.map((p) => [p.pemohonId, p.jenisId])).toEqual([['pdk_zulkifli', 'js_ss_sku']])
    expect(kembali[0].dikembalikan?.oleh.nama).toBe('H. Muhammad Nasir')
  })
  it('menunggu: semuanya online, yang tertua masuk 2 hari kerja lalu', () => {
    expect(status('menunggu').every((p) => p.kanal === 'online')).toBe(true)
    const lama = status('menunggu').map((p) => hariKerjaBerlalu(p.masukPada, waktuIsoWib(SEKARANG)))
    expect(Math.max(...lama)).toBe(2)
  })
  it('Siti Rahmah: satu Domisili berstatus Diproses dan tidak punya SKTM (alur demo 1)', () =>
    expect(db.permohonan.filter((p) => p.pemohonId === 'pdk_siti_rahmah').map((p) => [p.jenisId, p.status])).toEqual([
      ['js_ss_skd', 'diproses'],
    ]))
  it('nomor surat urut per tahun tanpa celah, termasuk yang dibatalkan; kode verifikasi unik', () => {
    const terbit = db.permohonan.flatMap((p) => (p.terbit ? [p.terbit] : []))
    expect(terbit).toHaveLength(status('selesai').length + status('dibatalkan').length)
    for (const tahun of new Set(terbit.map((t) => t.tahun))) {
      const setahun = terbit.filter((t) => t.tahun === tahun).sort((a, b) => a.urut - b.urut)
      expect(setahun.map((t) => t.urut), String(tahun)).toEqual(setahun.map((_, i) => i + 1))
      // Nomor mengikuti urutan waktu tanda tangan.
      const waktu = setahun.map((t) => t.pada)
      expect(waktu, String(tahun)).toEqual([...waktu].sort())
    }
    expect(new Set(terbit.map((t) => t.kodeVerifikasi)).size).toBe(terbit.length)
    expect(terbit.find((t) => t.tahun === 2026)?.nomor).toMatch(/^[\d.]+\/\d{3}\/SS\/[IVX]+\/2026$/)
  })
  it('tidak ada kejadian di masa depan; kejadian hari ini tidak sebelum 07.30 (fokus review 5)', () => {
    const batas = waktuIsoWib(new Date(SEKARANG.getTime() - 5 * 60_000))
    const hariIni = tanggalIsoWib(SEKARANG)
    const semua = db.permohonan.flatMap((p) => [
      p.masukPada,
      ...p.riwayat.map((r) => r.waktu),
      ...(p.terbit ? [p.terbit.pada] : []),
      ...(p.diambil ? [p.diambil.pada] : []),
    ])
    for (const w of semua) {
      expect(w <= batas, w).toBe(true)
      if (w.startsWith(hariIni)) expect(w.slice(11, 16) >= '07:30', w).toBe(true)
    }
  })
  it('riwayat berurutan waktu, diawali "diajukan" (online) atau "dibuat" (loket)', () => {
    for (const p of db.permohonan) {
      const waktu = p.riwayat.map((r) => r.waktu)
      expect(waktu, p.id).toEqual([...waktu].sort())
      expect(p.riwayat[0], p.id).toMatchObject({ kejadian: p.kanal === 'online' ? 'diajukan' : 'dibuat', waktu: p.masukPada })
    }
  })
  it('online hanya untuk jenis yang mengizinkannya; lampiran hanya dari permohonan online', () => {
    const online = new Map(db.jenisSurat.map((j) => [j.id, j.online]))
    for (const p of db.permohonan) {
      if (p.kanal === 'online') expect(online.get(p.jenisId), p.id).toBe(true)
      else expect(p.lampiran, p.id).toEqual([])
    }
  })
  it('surat kelahiran dan kematian tertaut ke mutasinya', () => {
    const skl = db.permohonan.filter((p) => p.jenisId === 'js_ss_skl')
    const skm = db.permohonan.filter((p) => p.jenisId === 'js_ss_skm')
    expect(skl.length).toBeGreaterThan(0)
    expect(skm.length).toBeGreaterThan(0)
    for (const p of [...skl, ...skm]) expect(db.mutasi.find((m) => m.id === p.mutasiId)?.pendudukIds[0], p.id).toBe(p.subjekId)
    for (const p of skm) expect(db.penduduk.find((x) => x.id === p.subjekId)?.statusDasar).toBe('Meninggal')
  })
  it('median waktu selesai paling lama 1 hari kerja; isi surat dibekukan', () => {
    const lama = db.permohonan
      .flatMap((p) => (p.terbit ? [hariKerjaBerlalu(p.masukPada, p.terbit.pada)] : []))
      .sort((a, b) => a - b)
    expect(lama[Math.floor(lama.length / 2)]).toBeLessThanOrEqual(1)
    const skd = db.permohonan.find((p) => p.status === 'selesai' && p.jenisId === 'js_ss_skd')
    expect(skd?.terbit?.lembar.judul).toBe('SURAT KETERANGAN DOMISILI')
    expect(skd?.riwayat.find((r) => r.kejadian === 'tandatangani')?.catatan).toBe(skd?.terbit?.nomor)
  })
  it('Buku hari ini: setiap permohonan yang masuk hari ini tercatat', () => {
    const hariIni = tanggalIsoWib(SEKARANG)
    const masuk = db.permohonan.filter((p) => p.masukPada.startsWith(hariIni)).map((p) => p.id)
    expect(masuk.length).toBeGreaterThan(0)
    const catatan = db.aktivitas.filter((a) => a.jenis === 'permohonan-masuk')
    expect(catatan.map((a) => a.rujukan?.id)).toEqual(expect.arrayContaining(masuk))
    expect(catatan.every((a) => a.waktu.startsWith(hariIni) && a.rujukan?.jenis === 'permohonan')).toBe(true)
  })
  it('loket hanya melayani di hari kerja pukul 08.00-15.30, juga bila demo dibuka malam hari', () => {
    for (const dbUji of [db, bangkitkanDb(new Date('2026-09-24T14:00:00Z'))]) {
      for (const p of dbUji.permohonan.filter((x) => x.kanal === 'loket')) {
        const w = keWaktuWib(p.masukPada)
        const menit = w.getUTCHours() * 60 + w.getUTCMinutes()
        expect(w.getUTCDay() !== 0 && w.getUTCDay() !== 6, p.masukPada).toBe(true)
        expect(menit >= 8 * 60 && menit <= 15 * 60 + 30, p.masukPada).toBe(true)
      }
    }
  })
})
