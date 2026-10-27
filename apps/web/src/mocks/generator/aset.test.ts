import { describe, expect, it } from 'vitest'
import { asetSchema } from '@/domain/aset/schema'
import { bangkitkanDb } from './index'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))

describe('aset desa demo (SPEC §12.6)', () => {
  it('40 butir sah dengan kode unik', () => {
    expect(db.aset).toHaveLength(40)
    for (const a of db.aset) expect(asetSchema.parse(a)).toEqual(a)
    expect(new Set(db.aset.map((a) => a.kode)).size).toBe(40)
  })
  it('isi sesuai SPEC: 2 bidang tanah kas desa, kantor dan balai desa, 4 posyandu, ambulans, 2 motor, perahu dinas', () => {
    const nama = (kategori: string) => db.aset.filter((a) => a.kategori === kategori).map((a) => a.nama)
    expect(nama('Tanah')).toEqual(['Tanah kas desa (kebun sawit)', 'Tanah kantor desa'])
    expect(db.aset.find((a) => a.nama === 'Tanah kas desa (kebun sawit)')?.keterangan).toMatch(/^2,5 ha/)
    expect(nama('Bangunan').filter((n) => n.startsWith('Gedung Posyandu'))).toHaveLength(4)
    expect(nama('Bangunan')).toEqual(expect.arrayContaining(['Kantor desa', 'Balai desa']))
    expect(nama('Kendaraan')).toEqual(['Ambulans desa', 'Sepeda motor dinas', 'Sepeda motor dinas', 'Perahu dinas bermesin'])
  })
})
