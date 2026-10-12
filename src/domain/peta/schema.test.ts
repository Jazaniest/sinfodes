import { describe, expect, it } from 'vitest'
import { dalamPoligon, lapisanPetaSchema, ringTertutup, type Titik } from './schema'

const PERSEGI: Titik[] = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]

describe('aturan peta (SPEC §8)', () => {
  it('titik di dalam poligon', () => {
    expect(dalamPoligon([1, 1], PERSEGI)).toBe(true)
    expect(dalamPoligon([3, 1], PERSEGI)).toBe(false)
    expect(dalamPoligon([1, -0.5], PERSEGI)).toBe(false)
  })
  it('ring batas dusun harus tertutup', () => {
    expect(ringTertutup(PERSEGI)).toBe(true)
    expect(ringTertutup(PERSEGI.slice(0, 4))).toBe(false)
  })
  it('lapisan peta: batas dusun, fasilitas, dan kegiatan', () => {
    const lapisan = {
      pusat: [102.7, 0.28], zoom: 13,
      dusun: [{ dusunId: 'dsn_ss_1', batas: PERSEGI }],
      fasilitas: [{ id: 'fas_a', desaId: 'd', jenis: 'masjid', nama: 'Masjid Al-Ikhlas', dusunId: 'dsn_ss_1', titik: [1, 1], keterangan: null }],
      kegiatan: [{ id: 'kgt_a', nama: 'Drainase', status: 'selesai', progresFisik: 100, dusunId: 'dsn_ss_1', titik: [1, 1] }],
    }
    expect(lapisanPetaSchema.parse(lapisan)).toEqual(lapisan)
    expect(lapisanPetaSchema.safeParse({ ...lapisan, pusat: [200, 0] }).success).toBe(false)
  })
})
