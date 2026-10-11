import { beforeAll, describe, expect, it } from 'vitest'
import { aktivitasSchema } from '@/domain/aktivitas/schema'
import { hitungUmur, tanggalIsoWib } from '@/domain/format/tanggal'
import { periksaNomorKk } from '@/domain/keluarga/nomor-kk'
import { mutasiSchema, type JenisMutasi, type MutasiDari } from '@/domain/mutasi/schema'
import { dataBelumLengkap } from '@/domain/penduduk/filter'
import { riwayatSchema } from '@/domain/penduduk/riwayat'
import { pendudukSchema, type Penduduk } from '@/domain/penduduk/schema'
import type { DbDemo } from '../tipe-db'
import { bangkitkanDb } from './index'
import { MUTASI_BULAN_INI } from './mutasi'

/** Kamis, 24 September 2026 pukul 09.00 WIB */
const ACUAN = new Date('2026-09-24T02:00:00Z')
let db: DbDemo
let perId: Map<string, Penduduk>
beforeAll(() => {
  db = bangkitkanDb(ACUAN)
  perId = new Map(db.penduduk.map((p) => [p.id, p] as const))
})
const hidup = () => db.penduduk.filter((p) => p.statusDasar === 'Hidup')
const hitungBulanIni = (jenis: JenisMutasi, d: DbDemo = db) =>
  d.mutasi.filter((m) => m.jenis === jenis && m.tanggal.startsWith('2026-09')).length

describe('jumlah tetap setelah mutasi (SPEC §12.3)', () => {
  it('penduduk hidup tetap 2.812 (1.431 L, 1.381 P) dalam 806 KK', () => {
    expect(hidup()).toHaveLength(2812)
    expect(hidup().filter((p) => p.jenisKelamin === 'L')).toHaveLength(1431)
    expect(db.keluarga).toHaveLength(806)
  })
  it('balita tetap 211 dan data belum lengkap tetap 12', () => {
    expect(hidup().filter((p) => hitungUmur(p.tanggalLahir, ACUAN).tahun <= 4)).toHaveLength(211)
    expect(hidup().filter((p) => dataBelumLengkap(p, ACUAN))).toHaveLength(12)
  })
})

describe('mutasi (SPEC §12.6)', () => {
  it('bulan berjalan: 3 lahir, 1 meninggal, 2 datang, 4 pindah', () =>
    expect({
      lahir: hitungBulanIni('lahir'),
      meninggal: hitungBulanIni('meninggal'),
      datang: hitungBulanIni('datang'),
      pindah: hitungBulanIni('pindah'),
    }).toEqual(MUTASI_BULAN_INI))
  it('kelahiran 24 bulan sekitar 45 per tahun', () => {
    const n = db.mutasi.filter((m) => m.jenis === 'lahir').length
    expect(n).toBeGreaterThanOrEqual(70)
    expect(n).toBeLessThanOrEqual(110)
  })
  it('valid terhadap skema dan merujuk penduduk dengan status yang sesuai', () => {
    const statusSeharusnya = { lahir: 'Hidup', datang: 'Hidup', meninggal: 'Meninggal', pindah: 'Pindah' } as const
    for (const m of db.mutasi) {
      expect(mutasiSchema.safeParse(m).success, m.id).toBe(true)
      for (const id of m.pendudukIds) expect(perId.get(id)?.statusDasar, `${m.id} → ${id}`).toBe(statusSeharusnya[m.jenis])
      if (m.jenis === 'lahir') expect(perId.get(m.pendudukIds[0])?.tanggalLahir).toBe(m.tanggal)
    }
  })
  it('tidak ada kejadian di masa depan; dicatat setelah kejadian, paling lambat 5 menit lalu', () => {
    for (const m of db.mutasi) {
      expect(m.tanggal <= '2026-09-24').toBe(true)
      expect(tanggalIsoWib(new Date(m.dicatatPada)) >= m.tanggal, m.id).toBe(true)
      expect(Date.parse(m.dicatatPada)).toBeLessThanOrEqual(ACUAN.getTime() - 5 * 60_000)
    }
  })
  it('bayi dibuat di sistem saat kelahirannya dicatat', () => {
    for (const m of db.mutasi.filter((x) => x.jenis === 'lahir')) {
      expect(perId.get(m.pendudukIds[0])?.dibuatPada).toBe(m.dicatatPada)
    }
  })
  it('pendatang: seluruh anggota KK lahir di luar desa; KK terbit setelah datang', () => {
    const datang = db.mutasi.filter((m): m is MutasiDari<'datang'> => m.jenis === 'datang')
    for (const m of datang) {
      const kk = db.keluarga.find((k) => k.id === m.rincian.keluargaId)
      expect(kk && kk.tanggalTerbit >= m.tanggal).toBe(true)
      for (const id of m.pendudukIds) expect(perId.get(id)?.nik?.startsWith('140509')).toBe(false)
    }
  })
})

describe('konsistensi data (SPEC §12.4)', () => {
  it('semua penduduk valid terhadap skema', () =>
    db.penduduk.forEach((p) => expect(pendudukSchema.safeParse(p).success, p.id).toBe(true)))
  it('mantan penduduk tidak tercantum di anggota KK, tetapi KK-nya ada', () => {
    const anggota = new Set(db.keluarga.flatMap((k) => k.anggotaIds))
    const idKk = new Set(db.keluarga.map((k) => k.id))
    for (const p of db.penduduk) {
      expect(anggota.has(p.id), p.id).toBe(p.statusDasar === 'Hidup')
      expect(idKk.has(p.keluargaId), p.id).toBe(true)
    }
  })
  it('NIK unik; penduduk hidup tanpa NIK hanya bayi di bawah 3 bulan', () => {
    const semua = db.penduduk.flatMap((p) => (p.nik ? [p.nik] : []))
    expect(new Set(semua).size).toBe(semua.length)
    for (const p of hidup()) expect(p.nik === null, p.id).toBe(hitungUmur(p.tanggalLahir, ACUAN).bulan < 3)
  })
  it('nomor KK unik dan cocok dengan tanggal terbit', () => {
    expect(new Set(db.keluarga.map((k) => k.nomorKk)).size).toBe(db.keluarga.length)
    for (const k of db.keluarga) {
      const hasil = periksaNomorKk(k.nomorKk, ACUAN)
      expect(hasil.status === 'valid' ? hasil.tanggalTerbit : hasil.status, k.id).toBe(k.tanggalTerbit)
    }
  })
  it('riwayat: nilai baru sama dengan data sekarang', () => {
    for (const r of db.riwayat) {
      expect(riwayatSchema.safeParse(r).success).toBe(true)
      const p = perId.get(r.pendudukId)
      expect(p?.[r.field] ?? null, r.id).toBe(r.nilaiBaru)
      expect(p && r.waktu <= p.diubahPada).toBe(true)
    }
  })
  it('setiap mutasi dan riwayat tercatat di buku aktivitas', () => {
    // Kejadian surat (2B-1) dan pengaduan (3A) juga ada di buku aktivitas; yang dihitung di sini hanya kependudukan.
    const kependudukan = db.aktivitas.filter((a) => a.rujukan?.jenis !== 'permohonan' && a.rujukan?.jenis !== 'pengaduan')
    expect(kependudukan).toHaveLength(db.mutasi.length + db.riwayat.length)
    db.aktivitas.forEach((a) => expect(aktivitasSchema.safeParse(a).success, a.id).toBe(true))
  })
  it('seed dan tanggal acuan yang sama menghasilkan data identik', () =>
    expect(JSON.stringify(bangkitkanDb(ACUAN))).toBe(JSON.stringify(db)))
})

describe('kejadian hari ini (SPEC §12.7)', () => {
  it('hanya antara 07.30 dan 5 menit sebelum sekarang; minimal satu kelahiran dan dua perubahan', () => {
    const hariIni = db.aktivitas.filter((a) => a.waktu.startsWith('2026-09-24'))
    expect(hariIni.filter((a) => a.jenis === 'penduduk-ubah')).toHaveLength(2)
    expect(hariIni.some((a) => a.jenis === 'mutasi-lahir')).toBe(true)
    for (const a of hariIni) {
      expect(a.waktu >= '2026-09-24T07:30:00+07:00' && a.waktu <= '2026-09-24T08:55:00+07:00', a.waktu).toBe(true)
    }
  })
  it('demo dibuka pukul 06.00: belum ada kejadian hari ini, bulan berjalan tetap lengkap', () => {
    const pagi = bangkitkanDb(new Date('2026-09-23T23:00:00Z'))
    expect(pagi.aktivitas.filter((a) => a.waktu.startsWith('2026-09-24'))).toHaveLength(0)
    expect(hitungBulanIni('lahir', pagi)).toBe(3)
    expect(hitungBulanIni('pindah', pagi)).toBe(4)
  })
})
