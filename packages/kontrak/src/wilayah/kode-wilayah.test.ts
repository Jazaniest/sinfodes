import { describe, expect, it } from 'vitest'
import { bertitik, daftarProvinsi, kabupatenDi, kecamatanDi, wilayahKecamatan } from './kode-wilayah'

describe('tabel kode wilayah untuk isian Tambah desa (SPEC §4.5, §11)', () => {
  it('kode bertitik seperti di data desa', () => {
    expect(bertitik('140509')).toBe('14.05.09')
    expect(bertitik('1405')).toBe('14.05')
    expect(bertitik('14')).toBe('14')
  })
  it('pilihan bertingkat provinsi → kabupaten → kecamatan, urut nama', () => {
    expect(daftarProvinsi()).toHaveLength(38)
    expect(daftarProvinsi()[0]).toEqual({ kode: '11', nama: 'Aceh' })
    expect(kabupatenDi('14')).toHaveLength(12)
    expect(kabupatenDi('14').find((k) => k.nama === 'Pelalawan')).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(kabupatenDi('15')).toEqual([])
    expect(kecamatanDi('14.05')).toHaveLength(12)
    expect(kecamatanDi('14.05').find((k) => k.nama === 'Teluk Meranti')).toEqual({ kode: '14.05.09', nama: 'Teluk Meranti' })
    expect(kecamatanDi('14.01').map((k) => k.nama)).toEqual(['Kampa', 'Tambang'])
    expect(kecamatanDi('14.71')).toEqual([])
  })
  it('wilayah lengkap dari kode kecamatan; kode yang tidak dikenal → null', () => {
    expect(wilayahKecamatan('14.08.04')).toEqual({
      kecamatan: { kode: '14.08.04', nama: 'Tualang' },
      kabupaten: { kode: '14.08', nama: 'Siak' },
      provinsi: { kode: '14', nama: 'Riau' },
    })
    expect(wilayahKecamatan('14.05.99')).toBeNull()
  })
})
