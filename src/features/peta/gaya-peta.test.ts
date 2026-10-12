import { describe, expect, it } from 'vitest'
import type { LapisanPeta } from '@/domain/peta/schema'
import { fiturPeta, gayaPeta, ID_LAPISAN, LAPISAN_KLIK, SUMBER_DASAR } from './gaya-peta'

const LAPISAN: LapisanPeta = {
  pusat: [102.7, 0.28], zoom: 13,
  dusun: [{ dusunId: 'dsn_ss_1', batas: [[102.68, 0.298], [102.7, 0.298], [102.7, 0.28], [102.68, 0.28], [102.68, 0.298]] }],
  fasilitas: [{ id: 'fas_ss_01', desaId: 'd', jenis: 'kantor-desa', nama: 'Kantor Desa', dusunId: 'dsn_ss_1', titik: [102.69, 0.289], keterangan: null }],
  kegiatan: [{ id: 'kgt_ss_06', nama: 'Lampu jalan tenaga surya', status: 'selesai', progresFisik: 100, dusunId: 'dsn_ss_1', titik: [102.695, 0.286] }],
}

describe('gaya peta kertas (SPEC §8)', () => {
  it('tanpa label nama tempat: tidak ada lapisan symbol, glyph, maupun sprite', () => {
    const gaya = gayaPeta(LAPISAN)
    expect(gaya.layers.some((l) => l.type === 'symbol')).toBe(false)
    expect(gaya.glyphs).toBeUndefined()
    expect(gaya.sprite).toBeUndefined()
  })
  it('tile dasar OpenFreeMap tanpa API key, dengan atribusi OpenStreetMap', () => {
    const dasar = gayaPeta(LAPISAN).sources.dasar
    expect(dasar).toMatchObject({ type: 'vector', url: SUMBER_DASAR })
    expect(SUMBER_DASAR).toBe('https://tiles.openfreemap.org/planet')
    expect(JSON.stringify(dasar)).toContain('OpenStreetMap')
  })
  it('lapisan desa sendiri: batas dusun, fasilitas, kegiatan; semua id lapisan yang disaklar dan diklik ada', () => {
    const f = fiturPeta(LAPISAN)
    expect(f.dusun.features[0]).toMatchObject({ properties: { id: 'dsn_ss_1' }, geometry: { type: 'Polygon' } })
    expect(f.fasilitas.features[0]).toMatchObject({ properties: { id: 'fas_ss_01', jenis: 'kantor-desa' }, geometry: { type: 'Point', coordinates: [102.69, 0.289] } })
    expect(f.kegiatan.features[0].properties).toMatchObject({ id: 'kgt_ss_06', status: 'selesai' })
    const id = new Set(gayaPeta(LAPISAN).layers.map((l) => l.id))
    for (const daftar of Object.values(ID_LAPISAN)) for (const x of daftar) expect(id.has(x), x).toBe(true)
    for (const x of Object.keys(LAPISAN_KLIK)) expect(id.has(x), x).toBe(true)
  })
})
