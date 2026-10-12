import { describe, expect, it } from 'vitest'
import { judulDariCerita, kirimPengaduanWargaSchema } from './pengaduan'

describe('pengaduan dari layanan warga (SPEC §10)', () => {
  it('judul diambil dari kalimat pertama cerita', () => {
    expect(judulDariCerita('Lampu jalan di depan surau mati sejak Senin. Mohon segera diperbaiki.')).toBe(
      'Lampu jalan di depan surau mati sejak Senin',
    )
    expect(judulDariCerita('Parit tersumbat\nAir meluap ke jalan kalau hujan')).toBe('Parit tersumbat')
  })
  it('kalimat pertama yang panjang dipotong di batas kata, paling panjang 60 huruf', () => {
    const judul = judulDariCerita(
      'Jalan lingkungan di RT 012 berlubang besar dan sangat berbahaya bagi pengendara motor pada malam hari',
    )
    expect(judul.length).toBeLessThanOrEqual(61)
    expect(judul.endsWith('…')).toBe(true)
    expect(judul.startsWith('Jalan lingkungan di RT 012')).toBe(true)
  })
  it('cerita paling sedikit 20 huruf; lokasi boleh kosong', () => {
    const dasar = { kunci: 'kunci-uji-0001', kategori: 'Infrastruktur', lokasi: null }
    expect(kirimPengaduanWargaSchema.safeParse({ ...dasar, cerita: 'Jalan rusak' }).error?.issues[0]?.message).toBe(
      'Ceritakan masalahnya, paling sedikit 20 huruf.',
    )
    expect(kirimPengaduanWargaSchema.safeParse({ ...dasar, cerita: 'Jalan di depan surau berlubang besar.' }).success).toBe(true)
  })
})
