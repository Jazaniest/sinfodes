import { describe, expect, it } from 'vitest'
import type { Desa } from '@/domain/wilayah/schema'
import { ID_SUNGAI_SIALANG } from './data/desa-demo'
import { PUSAT_KECAMATAN } from './data/pusat-kecamatan'
import { bangkitkanDb } from './generator'
import { titikDesa } from './titik-desa'

const SEKARANG = new Date('2026-09-24T02:00:00Z')

describe('titik desa di peta kabupaten (SPEC-V0.2 §8.3 butir 5)', () => {
  const db = bangkitkanDb(SEKARANG)
  it('desa yang menggambar Peta Desa memakai pusat petanya', () => {
    const ss = db.desa.find((d) => d.id === ID_SUNGAI_SIALANG)
    if (!ss) throw new Error('Sungai Sialang tidak ada')
    expect(titikDesa(db, ss)).toEqual([102.76, 0.2475])
  })
  it('desa lain: titik perkiraan 0,02-0,07 derajat dari pusat kecamatannya, sama di setiap pemanggilan', () => {
    const desa = db.desa.filter((d) => (d.kabupaten.kode === '14.05' || d.kabupaten.kode === '14.08') && d.id !== ID_SUNGAI_SIALANG)
    expect(desa.length).toBe(35)
    for (const d of desa) {
      const t = titikDesa(db, d)
      const pusat = PUSAT_KECAMATAN[d.kecamatan.kode.replaceAll('.', '')]
      if (!t || !pusat) throw new Error(`${d.nama} tanpa titik`)
      const jarak = Math.hypot(t[0] - pusat[0], t[1] - pusat[1])
      expect(jarak, d.nama).toBeGreaterThanOrEqual(0.0199)
      expect(jarak, d.nama).toBeLessThanOrEqual(0.0701)
      expect(titikDesa(db, d)).toEqual(t)
    }
    expect(new Set(desa.map((d) => JSON.stringify(titikDesa(db, d)))).size).toBe(desa.length)
  })
  it('kecamatan yang tidak ada di tabel pusat → null', () => {
    const asing: Desa = { ...db.desa[0], id: 'desa_asing', kecamatan: { kode: '33.10.01', nama: 'Prambanan' } }
    expect(titikDesa(db, asing)).toBeNull()
  })
  it('14 pusat kecamatan dari OpenStreetMap', () => {
    expect(Object.keys(PUSAT_KECAMATAN)).toHaveLength(14)
    expect(PUSAT_KECAMATAN['140509']).toEqual([102.7666, 0.3881])
  })
})
