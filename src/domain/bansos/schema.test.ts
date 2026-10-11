import { describe, expect, it } from 'vitest'
import { filterPenerimaSchema, labelTahap, tahanPenyaluran, tahapBerikutnya, type TahapBansos } from './schema'

const TAHAP: TahapBansos[] = [
  { ke: 1, periode: 'Januari–Maret', jadwal: '2026-03-31' },
  { ke: 2, periode: 'April–Juni', jadwal: '2026-06-30' },
  { ke: 3, periode: 'Juli–September', jadwal: '2026-09-30' },
  { ke: 4, periode: 'Oktober–Desember', jadwal: '2026-12-15' },
]

describe('aturan bantuan sosial (SPEC §8, §12.6)', () => {
  it('tahap berikutnya: jadwal hari ini masih dihitung; semua lewat → null', () => {
    expect(tahapBerikutnya({ tahap: TAHAP }, '2026-09-24')?.ke).toBe(3)
    expect(tahapBerikutnya({ tahap: TAHAP }, '2026-09-30')?.ke).toBe(3)
    expect(tahapBerikutnya({ tahap: TAHAP }, '2026-10-01')?.ke).toBe(4)
    expect(tahapBerikutnya({ tahap: TAHAP }, '2026-12-16')).toBeNull()
  })
  it('penerima ditinjau: yang dijadwalkan ditahan, yang sudah terjadi tetap (fokus review 3)', () => {
    expect(tahanPenyaluran(['tersalur', 'belum-diambil', 'dijadwalkan', 'dijadwalkan'])).toEqual([
      'tersalur', 'belum-diambil', 'ditahan', 'ditahan',
    ])
  })
  it('label tahap memakai angka Romawi', () => expect(labelTahap(3)).toBe('Tahap III'))
  it('filter penerima: semua penerima, halaman pertama', () => {
    expect(filterPenerimaSchema.parse({})).toEqual({ tampil: 'semua', page: 1, pageSize: 25 })
    expect(filterPenerimaSchema.parse({ tampil: 'perlu-ditinjau', dusun: '2' })).toMatchObject({ tampil: 'perlu-ditinjau', dusun: 2 })
  })
})
