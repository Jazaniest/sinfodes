import { describe, expect, it } from 'vitest'
import { akhirBulan, bulanLaporanSchema, bulanLaporanTersedia } from './laporan'

const SEKARANG = new Date('2026-09-24T02:00:00Z')

describe('bulan laporan bulanan (SPEC-V0.2 §8.3 butir 7: bulan yang sudah tutup)', () => {
  it('Pelalawan bergabung 2 Maret 2026: Maret sampai Agustus, terbaru dulu', () => {
    expect(bulanLaporanTersedia('2026-03-02', SEKARANG)).toEqual(['2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03'])
  })
  it('Siak bergabung 17 Agustus 2026: hanya Agustus', () => {
    expect(bulanLaporanTersedia('2026-08-17', SEKARANG)).toEqual(['2026-08'])
  })
  it('bergabung bulan ini: belum ada; bergabung lama: paling banyak 12 bulan', () => {
    expect(bulanLaporanTersedia('2026-09-01', SEKARANG)).toEqual([])
    const lama = bulanLaporanTersedia('2024-01-15', SEKARANG)
    expect(lama).toHaveLength(12)
    expect([lama[0], lama[11]]).toEqual(['2026-08', '2025-09'])
  })
  it('awal tahun: bulan lalu adalah Desember tahun sebelumnya', () => {
    expect(bulanLaporanTersedia('2025-11-03', new Date('2026-01-10T02:00:00Z'))).toEqual(['2025-12', '2025-11'])
  })
  it('format bulan dan akhir bulan', () => {
    expect(bulanLaporanSchema.safeParse('2026-08').success).toBe(true)
    expect(bulanLaporanSchema.safeParse('2026-13').success).toBe(false)
    expect(bulanLaporanSchema.safeParse('agustus').success).toBe(false)
    expect(akhirBulan('2026-02')).toBe('2026-02-28')
    expect(akhirBulan('2026-12')).toBe('2026-12-31')
  })
})
