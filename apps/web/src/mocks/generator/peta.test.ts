import { describe, expect, it } from 'vitest'
import { dalamPoligon, petaDesaSchema, ringTertutup } from '@/domain/peta/schema'
import { bangkitkanDb } from './index'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))
const [peta] = db.peta

describe('peta desa demo (SPEC §8)', () => {
  it('satu peta Sungai Sialang dengan batas 4 dusun yang tertutup', () => {
    expect(db.peta).toHaveLength(1)
    expect(petaDesaSchema.parse(peta)).toEqual(peta)
    expect(peta.dusun.map((d) => d.dusunId)).toEqual(['dsn_ss_1', 'dsn_ss_2', 'dsn_ss_3', 'dsn_ss_4'])
    expect(peta.dusun.every((d) => ringTertutup(d.batas))).toBe(true)
  })
  it('13 fasilitas umum: kantor desa, 3 sekolah, 4 masjid, 4 posyandu, 1 pustu; masing-masing di dalam dusunnya', () => {
    const jumlah = Object.fromEntries(['kantor-desa', 'sekolah', 'masjid', 'posyandu', 'pustu'].map((j) => [j, peta.fasilitas.filter((f) => f.jenis === j).length]))
    expect(jumlah).toEqual({ 'kantor-desa': 1, sekolah: 3, masjid: 4, posyandu: 4, pustu: 1 })
    for (const f of peta.fasilitas) {
      const batas = peta.dusun.find((d) => d.dusunId === f.dusunId)?.batas ?? []
      expect(dalamPoligon(f.titik, batas), f.nama).toBe(true)
    }
    expect(peta.fasilitas.filter((f) => f.jenis === 'posyandu').map((f) => f.nama)).toEqual([
      'Posyandu Melati', 'Posyandu Mawar', 'Posyandu Kenanga', 'Posyandu Anggrek',
    ])
  })
})
