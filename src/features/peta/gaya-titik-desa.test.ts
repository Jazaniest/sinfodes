import { describe, expect, it } from 'vitest'
import { gayaPeta } from './gaya-peta'
import { batasTitik, fiturTitik, gayaTitikDesa, WARNA_TITIK } from './gaya-titik-desa'

const TITIK = [
  { id: 'a', titik: [102.1, 0.3] as [number, number], warna: WARNA_TITIK.status.Aktif },
  { id: 'b', titik: [101.6, -0.2] as [number, number], warna: WARNA_TITIK.status.Persiapan },
]

describe('gaya peta titik desa kabupaten (SPEC-V0.2 §8.2, §8.3 butir 5)', () => {
  it('satu fitur per titik dengan id dan warna', () => {
    expect(fiturTitik(TITIK).features).toEqual([
      { type: 'Feature', properties: { id: 'a', warna: '#28704F' }, geometry: { type: 'Point', coordinates: [102.1, 0.3] } },
      { type: 'Feature', properties: { id: 'b', warna: '#8A6212' }, geometry: { type: 'Point', coordinates: [101.6, -0.2] } },
    ])
  })
  it('tanpa lapisan symbol, dengan lapisan dasar yang sama dengan Peta Desa', () => {
    const gaya = gayaTitikDesa(TITIK)
    expect(gaya.layers.some((l) => l.type === 'symbol')).toBe(false)
    expect(gaya.glyphs).toBeUndefined()
    const dasarDesa = gayaPeta({ pusat: [0, 0], zoom: 1, dusun: [], fasilitas: [], kegiatan: [] }).layers.slice(0, 6)
    expect(gaya.layers.slice(0, 6)).toEqual(dasarDesa)
    expect(gaya.layers.map((l) => l.id).slice(6)).toEqual(['titik', 'titik-terpilih'])
  })
  it('batas peta mencakup semua titik; kosong → null', () => {
    expect(batasTitik(TITIK)).toEqual([[101.6, -0.2], [102.1, 0.3]])
    expect(batasTitik([])).toBeNull()
  })
})
