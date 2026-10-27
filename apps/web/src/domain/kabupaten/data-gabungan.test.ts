import { describe, expect, it } from 'vitest'
import { barisCsvGabungan, dataGabunganSchema, KOLOM_CSV_GABUNGAN, samarkanGabungan, type BarisMentah } from './data-gabungan'

const baris = (blt: number): BarisMentah => ({
  laki: 100, perempuan: 100, jiwa: 200, kk: 60, u0_4: 20, u5_14: 40, u15_59: 120, u60: 20, blt, pkh: 10, pangan: 20,
})
const kodeNama = (kode: string, nama: string) => ({ kode, nama })

describe('Data gabungan tersamar (SPEC-V0.2 §8.3 butir 6)', () => {
  const mentah = {
    kecamatan: [
      { kecamatan: kodeNama('14.05.01', 'A'), desa: [{ id: 'a', nama: 'Desa A', status: 'Aktif' as const, baris: baris(3) }] },
      {
        kecamatan: kodeNama('14.05.02', 'B'),
        desa: [
          { id: 'b', nama: 'Desa B', status: 'Aktif' as const, baris: baris(10) },
          { id: 'c', nama: 'Desa C', status: 'Aktif' as const, baris: baris(20) },
          { id: 'x', nama: 'Desa X', status: 'Persiapan' as const, baris: null },
        ],
      },
    ],
  }
  const hasil = samarkanGabungan(mentah)
  it('kecamatan berisi satu desa: desa dan kecamatannya "<5"; kecamatan lain di kolom itu ikut "*" (fokus review 2)', () => {
    expect(hasil.kecamatan[0].desa[0].baris?.blt).toBe('<5')
    expect(hasil.kecamatan[0].baris?.blt).toBe('<5')
    expect(hasil.kecamatan[1].baris?.blt).toBe('*')
    // Kecamatan B tersamar, jadi salah satu desanya ikut, supaya jumlahnya tidak bisa dihitung dari desa-desanya.
    expect(hasil.kecamatan[1].desa.map((d) => d.baris?.blt ?? null)).toEqual(['*', 20, null])
    expect(hasil.total?.blt).toBe(33)
  })
  it('kolom lain tidak tersentuh; jumlah dihitung dari desa yang punya data', () => {
    expect(hasil.total).toMatchObject({ jiwa: 600, laki: 300, kk: 180, pangan: 60 })
    expect(hasil.kecamatan[1].baris).toMatchObject({ jiwa: 400, pkh: 20 })
  })
  it('lolos skema (tidak ada angka 1-4) dan CSV memakai sel yang sama', () => {
    expect(() => dataGabunganSchema.parse({ kabupaten: kodeNama('14.05', 'Pelalawan'), tanggal: '2026-09-24', ...hasil })).not.toThrow()
    const csv = barisCsvGabungan({ kabupaten: kodeNama('14.05', 'Pelalawan'), tanggal: '2026-09-24', ...hasil })
    expect(csv[0]).toEqual([...KOLOM_CSV_GABUNGAN])
    const kolomBlt = KOLOM_CSV_GABUNGAN.indexOf('BLT-DD')
    expect(csv.map((r) => [r[1], r[kolomBlt]])).toEqual([
      ['Desa', 'BLT-DD'],
      ['Desa A', '<5'],
      ['Jumlah kecamatan', '<5'],
      ['Desa B', '*'],
      ['Desa C', 20],
      ['Desa X', null],
      ['Jumlah kecamatan', '*'],
      ['Jumlah kabupaten', 33],
    ])
  })
  it('skema menolak angka 1-4 mentah', () => {
    const bocor = { kabupaten: kodeNama('14.05', 'P'), tanggal: '2026-09-24', total: { ...baris(3) }, kecamatan: [] }
    expect(dataGabunganSchema.safeParse(bocor).success).toBe(false)
  })
})
