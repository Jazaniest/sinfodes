import { describe, expect, it } from 'vitest'
import { asetSchema, filterAsetSchema, ringkasAset, type Aset } from './schema'

const aset = (kode: string, nilaiPerolehan: number, ubah: Partial<Aset> = {}): Aset => ({
  id: `ast_${kode}`, desaId: 'desa_sungai_sialang', kode, nama: 'Laptop', kategori: 'Peralatan', tahunPerolehan: 2022,
  asal: 'Pembelian', nilaiPerolehan, kondisi: 'baik', keterangan: null, ...ubah,
})

describe('aturan aset (SPEC §8)', () => {
  it('aset sah; kode berformat golongan.bidang.urut', () => {
    expect(asetSchema.parse(aset('02.06.001', 9_500_000))).toEqual(aset('02.06.001', 9_500_000))
    expect(asetSchema.safeParse(aset('2.6.1', 1)).success).toBe(false)
  })
  it('jumlah dan nilai perolehan dari baris yang tampil (fokus review 5)', () => {
    expect(ringkasAset([aset('02.06.001', 9_500_000), aset('02.06.002', 3_200_000)])).toEqual({ jumlah: 2, nilai: 12_700_000 })
    expect(ringkasAset([])).toEqual({ jumlah: 0, nilai: 0 })
  })
  it('filter kategori', () => {
    expect(filterAsetSchema.parse({ kategori: 'Tanah' })).toEqual({ kategori: 'Tanah' })
    expect(filterAsetSchema.safeParse({ kategori: 'Ternak' }).success).toBe(false)
  })
})
