import { describe, expect, it } from 'vitest'
import { barisCsvDanaDesa, KOLOM_CSV_DANA_DESA, ringkasDanaDesa, tertinggal, type DanaDesa, type DesaDanaDesa } from './dana-desa'
import { hrefPerhatianKabupaten, kalimatPerhatianKabupaten } from './perhatian'

const desa = (nama: string, apbdes: DesaDanaDesa['apbdes'], ketinggalan = false): DesaDanaDesa => ({
  id: `desa_${nama}`, nama, alamat: nama, status: 'Aktif', apbdes, tertinggal: ketinggalan,
})

describe('tertinggal (SPEC-V0.2 §8.3 butir 4: lebih dari 15 poin di bawah median)', () => {
  it('tepat 15 poin tidak tertinggal, walaupun pecahannya 15,0000001 (fokus review 1)', () => {
    expect(tertinggal(0.45, 0.6)).toBe(false)
    expect(tertinggal(0.449, 0.6)).toBe(true)
  })
  it('tanpa rasio atau tanpa median tidak pernah tertinggal', () => {
    expect(tertinggal(null, 0.6)).toBe(false)
    expect(tertinggal(0.1, null)).toBe(false)
  })
})

describe('ringkasDanaDesa', () => {
  it('menjumlahkan desa ber-APBDes saja dan menghitung yang tertinggal', () => {
    const hasil = ringkasDanaDesa([
      desa('a', { anggaran: 1_000, realisasi: 600 }),
      desa('b', { anggaran: 2_000, realisasi: 500 }, true),
      desa('c', null),
      desa('d', { anggaran: 0, realisasi: 0 }),
    ])
    expect(hasil).toEqual({ anggaran: 3_000, realisasi: 1_100, desaBerApbdes: 2, tertinggal: 1 })
  })
})

describe('CSV Dana Desa', () => {
  it('persen satu desimal dengan koma, Ya untuk tertinggal, dan sel kosong untuk desa tanpa APBDes', () => {
    const d: DanaDesa = {
      kabupaten: { kode: '14.05', nama: 'Pelalawan' },
      tahun: 2026,
      medianRealisasi: 0.6,
      total: { anggaran: 3_000, realisasi: 1_100, desaBerApbdes: 2, tertinggal: 1 },
      kecamatan: [
        {
          kecamatan: { kode: '14.05.09', nama: 'Teluk Meranti' },
          anggaran: 3_000, realisasi: 1_100, desaBerApbdes: 2, tertinggal: 1,
          desa: [desa('A', { anggaran: 1_000, realisasi: 625 }), desa('B', { anggaran: 2_000, realisasi: 480 }, true), desa('C', null)],
        },
      ],
    }
    const csv = barisCsvDanaDesa(d)
    expect(csv[0]).toEqual([...KOLOM_CSV_DANA_DESA])
    expect(csv[1]).toEqual(['Teluk Meranti', 'A', 'Aktif', 1_000, 625, '62,5', null])
    expect(csv[2]).toEqual(['Teluk Meranti', 'B', 'Aktif', 2_000, 480, '24,0', 'Ya'])
    expect(csv[3]).toEqual(['Teluk Meranti', 'C', 'Aktif', null, null, null, null])
  })
})

describe('perhatian kabupaten (SPEC-V0.2 §8.3 butir 1)', () => {
  it('realisasi tertinggal menuju Dana Desa; butir lain menuju Pemantauan', () => {
    expect(kalimatPerhatianKabupaten({ jenis: 'realisasi-tertinggal', jumlah: 3 })).toBe('3 desa realisasi Dana Desa tertinggal')
    expect(hrefPerhatianKabupaten({ jenis: 'realisasi-tertinggal', jumlah: 3 })).toBe('/kabupaten/admin/dana-desa')
    expect(kalimatPerhatianKabupaten({ jenis: 'tidak-aktif', jumlah: 2 })).toBe('2 desa tidak aktif 14 hari')
    expect(hrefPerhatianKabupaten({ jenis: 'berhenti-persiapan', jumlah: 1 })).toBe('/kabupaten/admin/pemantauan')
  })
})
