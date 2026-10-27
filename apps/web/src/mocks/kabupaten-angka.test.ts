import { describe, expect, it } from 'vitest'
import { jumlahKelompok } from '@/domain/keuangan/schema'
import { ID_SUNGAI_SIALANG } from './data/desa-demo'
import { bangkitkanDb } from './generator'
import { apbdesDesa, realisasiSampai } from './kabupaten-angka'

const SEKARANG = new Date('2026-09-24T02:00:00Z')
const BULAN_2026 = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']

describe('angka Dana Desa per desa (SPEC-V0.2 §8.3 butir 4)', () => {
  const db = bangkitkanDb(SEKARANG)
  it('belanja bulanan desa rekaman: Januari sampai bulan acuan, jumlahnya sama persis dengan realisasinya', () => {
    const berApbdes = db.rekamDesa.filter((r) => r.apbdes !== null)
    expect(berApbdes.length).toBeGreaterThan(20)
    for (const r of db.rekamDesa) {
      if (r.apbdes === null) {
        expect(r.belanjaBulanan).toBeNull()
        continue
      }
      expect(r.belanjaBulanan?.map((b) => b.bulan)).toEqual(BULAN_2026)
      expect(r.belanjaBulanan?.reduce((n, b) => n + b.belanja, 0)).toBe(r.apbdes.realisasi)
      expect(r.belanjaBulanan?.every((b) => b.belanja > 0)).toBe(true)
    }
  })
  it('realisasi sampai akhir Agustus = jumlah Januari-Agustus, tidak lebih dari realisasi tahun berjalan', () => {
    for (const desa of db.desa.filter((d) => d.kabupaten.kode === '14.05')) {
      const a = apbdesDesa(db, desa, 2026)
      if (!a) continue
      const sampaiAgustus = a.bulanan.filter((b) => b.bulan <= '2026-08').reduce((n, b) => n + b.belanja, 0)
      expect(realisasiSampai(a.bulanan, '2026-08')).toBe(sampaiAgustus)
      expect(realisasiSampai(a.bulanan, '2026-08')).toBeLessThanOrEqual(a.realisasi)
    }
  })
  it('Sungai Sialang dari APBDes panelnya; tahun lain tidak ada', () => {
    const desa = db.desa.find((d) => d.id === ID_SUNGAI_SIALANG)
    const apbdes = db.apbdes.find((a) => a.desaId === ID_SUNGAI_SIALANG && a.tahun === 2026)
    if (!desa || !apbdes) throw new Error('Data Sungai Sialang tidak ada')
    const a = apbdesDesa(db, desa, 2026)
    expect(a).toMatchObject(jumlahKelompok(apbdes, 'belanja'))
    expect(a?.bulanan).toEqual(apbdes.bulanan.map((b) => ({ bulan: b.bulan, belanja: b.belanja })))
    expect(apbdesDesa(db, desa, 2025)).toBeNull()
  })
})
