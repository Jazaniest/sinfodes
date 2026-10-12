import { describe, expect, it } from 'vitest'
import { barisKegiatanSchema, dokumentasiSchema, statusKegiatan, type BarisKegiatan } from './schema'

const KEGIATAN: BarisKegiatan = {
  id: 'kgt_a', desaId: 'desa_sungai_sialang', kodeApbdes: '5.2.01', nama: 'Semenisasi jalan lingkungan Dusun III', volume: '450 m',
  lokasi: 'Jalan lingkungan RT 011–013', dusunId: 'dsn_ss_3', sumberDana: 'DD', pelaksana: 'TPK Desa Sungai Sialang',
  mulai: '2026-06-15', targetSelesai: '2026-11-30', progresFisik: 70, status: 'berjalan', titik: [102.69, 0.27],
  dokumentasi: [{ persen: 0, tanggal: '2026-06-15', keterangan: 'Kondisi sebelum dikerjakan', foto: null }],
  anggaran: 245_000_000, realisasi: 151_900_000,
}

describe('aturan pembangunan (SPEC §8)', () => {
  it('kegiatan beserta anggaran dari APBDes sah', () => expect(barisKegiatanSchema.parse(KEGIATAN)).toEqual(KEGIATAN))
  it('status mengikuti progres fisik dan tanggal mulai', () => {
    expect(statusKegiatan(0, null)).toBe('perencanaan')
    expect(statusKegiatan(0, '2026-09-01')).toBe('berjalan')
    expect(statusKegiatan(70, '2026-06-15')).toBe('berjalan')
    expect(statusKegiatan(100, '2026-03-01')).toBe('selesai')
  })
  it('dokumentasi progres hanya 0%, 50%, atau 100%', () => {
    expect(dokumentasiSchema.safeParse({ persen: 50, tanggal: '2026-08-01', keterangan: 'Setengah jalan', foto: null }).success).toBe(true)
    expect(dokumentasiSchema.safeParse({ persen: 30, tanggal: '2026-08-01', keterangan: 'x', foto: null }).success).toBe(false)
  })
})
