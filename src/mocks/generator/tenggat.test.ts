import { describe, expect, it } from 'vitest'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { bangkitkanDb } from './index'

const SEKARANG = new Date('2026-09-24T02:00:00Z')

describe('tenggat Dana Desa contoh (SPEC-V0.2 §13)', () => {
  const db = bangkitkanDb(SEKARANG)
  it('empat tenggat relatif terhadap hari acuan, dibuat 70 hari sebelumnya', () => {
    expect(db.tenggatLaporan.map((t) => [t.id, t.kabupatenKode, t.tanggal, t.dibuatOleh.id])).toEqual([
      ['tgt_pll_smt1', '14.05', '2026-07-30', 'kab_fajar'],
      ['tgt_pll_dd2', '14.05', '2026-09-30', 'kab_fajar'],
      ['tgt_pll_akhir', '14.05', '2027-01-15', 'kab_fajar'],
      ['tgt_siak_dd2', '14.08', '2026-10-03', 'kab_wahyu'],
    ])
    expect(db.tenggatLaporan[1].nama).toBe('Laporan realisasi Dana Desa tahap II 2026')
    expect(db.tenggatLaporan.every((t) => t.dibuatPada.startsWith('2026-07-16'))).toBe(true)
  })
  it('Sungai Sialang mengirim semester I dan belum mengirim tahap II; kiriman hanya dari desa sasaran', () => {
    expect(db.kirimLaporan.find((k) => k.desaId === ID_SUNGAI_SIALANG && k.tenggatId === 'tgt_pll_smt1')?.tanggal).toBe('2026-07-26')
    expect(db.kirimLaporan.some((k) => k.desaId === ID_SUNGAI_SIALANG && k.tenggatId === 'tgt_pll_dd2')).toBe(false)
    expect(db.kirimLaporan.some((k) => k.tenggatId === 'tgt_pll_akhir')).toBe(false)
    for (const k of db.kirimLaporan) {
      const desa = db.desa.find((d) => d.id === k.desaId)
      const tenggat = db.tenggatLaporan.find((t) => t.id === k.tenggatId)
      expect(desa?.status === 'Aktif' || desa?.status === 'Uji coba', desa?.nama).toBe(true)
      expect(desa?.kabupaten.kode).toBe(tenggat?.kabupatenKode)
      expect(k.tanggal <= '2026-09-24').toBe(true)
    }
  })
})
