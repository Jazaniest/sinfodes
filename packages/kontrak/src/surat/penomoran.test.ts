import { describe, expect, it } from 'vitest'
import { penomoranSchema } from '../pengaturan/penomoran'
import { FORMAT_NOMOR_BAWAAN } from './nomor-surat'
import { susunPenomoran } from './penomoran'

const JENIS = [
  { id: 'js-sktm', kode: 'SKTM', nama: 'Surat keterangan tidak mampu', klasifikasi: '400' },
  { id: 'js-skd', kode: 'SKD', nama: 'Surat keterangan domisili', klasifikasi: '470' },
  { id: 'js-skp', kode: 'SKP', nama: 'Surat keterangan penghasilan', klasifikasi: '400' },
]
const DASAR = { formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun' as const, kodeSurat: 'SS', tahun: 2026 }

describe('susunPenomoran', () => {
  it('tanpa jenis memakai contoh bawaan "Surat keterangan" (SKD, 470) dan urut pertama', () => {
    const p = susunPenomoran({ ...DASAR, jenis: [], terbit: [] })
    expect(p.contoh).toEqual({ jenis: 'Surat keterangan', kode: 'SKD', klasifikasi: '470', urutPerTahun: 1, urutPerJenis: 1 })
    expect(p).toMatchObject({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS' })
  })

  it('tanpa terbit satu pun, contoh jatuh ke jenis pertama menurut kode', () => {
    const p = susunPenomoran({ ...DASAR, jenis: JENIS, terbit: [] })
    expect(p.contoh).toMatchObject({ kode: 'SKD', jenis: 'Surat keterangan domisili', klasifikasi: '470', urutPerTahun: 1, urutPerJenis: 1 })
  })

  it('contoh = jenis dengan terbit terbanyak', () => {
    const terbit = [
      { jenisId: 'js-sktm', tahun: 2026, urut: 1 },
      { jenisId: 'js-skp', tahun: 2026, urut: 2 },
      { jenisId: 'js-skp', tahun: 2026, urut: 3 },
    ]
    expect(susunPenomoran({ ...DASAR, jenis: JENIS, terbit }).contoh.kode).toBe('SKP')
  })

  it('seri jatuh ke kode menurut abjad, bukan urutan masukan', () => {
    const terbit = [
      { jenisId: 'js-sktm', tahun: 2026, urut: 1 },
      { jenisId: 'js-skp', tahun: 2026, urut: 2 },
    ]
    expect(susunPenomoran({ ...DASAR, jenis: JENIS, terbit }).contoh.kode).toBe('SKP')
    expect(susunPenomoran({ ...DASAR, jenis: [...JENIS].reverse(), terbit }).contoh.kode).toBe('SKP')
  })

  it('urutPerTahun = urut tertinggi tahun itu di semua jenis + 1; urutPerJenis = urut tertinggi jenis contoh + 1', () => {
    const terbit = [
      { jenisId: 'js-sktm', tahun: 2026, urut: 4 },
      { jenisId: 'js-sktm', tahun: 2026, urut: 9 },
      { jenisId: 'js-skd', tahun: 2026, urut: 12 },
    ]
    const p = susunPenomoran({ ...DASAR, jenis: JENIS, terbit })
    expect(p.contoh.kode).toBe('SKTM')
    expect(p.contoh.urutPerTahun).toBe(13)
    expect(p.contoh.urutPerJenis).toBe(10)
  })

  it('terbit tahun lain tidak dihitung', () => {
    const terbit = [
      { jenisId: 'js-skd', tahun: 2025, urut: 80 },
      { jenisId: 'js-skd', tahun: 2026, urut: 3 },
    ]
    const p = susunPenomoran({ ...DASAR, jenis: JENIS, terbit })
    expect(p.contoh.urutPerTahun).toBe(4)
    expect(p.contoh.urutPerJenis).toBe(4)
    expect(susunPenomoran({ ...DASAR, tahun: 2027, jenis: JENIS, terbit }).contoh.urutPerTahun).toBe(1)
  })

  it('nomor jenis yang sudah tidak ada di daftar tetap menggeser urut per tahun, bukan per jenis', () => {
    const terbit = [{ jenisId: 'js-hilang', tahun: 2026, urut: 20 }]
    const p = susunPenomoran({ ...DASAR, jenis: JENIS, terbit })
    expect(p.contoh.urutPerTahun).toBe(21)
    expect(p.contoh.urutPerJenis).toBe(1)
  })

  it('jawaban lolos penomoranSchema', () => {
    expect(() => penomoranSchema.parse(susunPenomoran({ ...DASAR, jenis: JENIS, terbit: [] }))).not.toThrow()
  })
})
