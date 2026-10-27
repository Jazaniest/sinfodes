import { describe, expect, it } from 'vitest'
import { POTENSI_UMUM, susunProfilSingkat } from './profil-singkat'

describe('templat profil singkat desa rekaman (rencana 7E-2 Tugas 5)', () => {
  const o = { nama: 'Sungai Gelugur', kecamatan: 'Kerumutan', kabupaten: 'Pelalawan', jiwa: 2145, potensi: 'perikanan sungai' }

  it('dua paragraf yang menyebut nama desa, wilayah, jumlah jiwa berformat, dan satu potensi', () => {
    const p = susunProfilSingkat(o)
    expect(p).toHaveLength(2)
    expect(p[0]).toContain('Desa Sungai Gelugur')
    expect(p[0]).toContain('Kecamatan Kerumutan, Kabupaten Pelalawan')
    expect(p[0]).toContain('2.145 jiwa')
    expect(p[1]).toContain('perikanan sungai')
  })
  it('tanpa data pribadi: tidak ada pola NIK 16 digit atau nama orang', () => {
    for (const potensi of POTENSI_UMUM) {
      const teks = susunProfilSingkat({ ...o, potensi }).join(' ')
      expect(teks).not.toMatch(/\d{16}/)
    }
  })
  it('daftar potensi umum: enam, termasuk kelapa sawit dan madu sialang', () => {
    expect(POTENSI_UMUM).toHaveLength(6)
    expect(POTENSI_UMUM).toContain('kelapa sawit')
    expect(POTENSI_UMUM).toContain('madu sialang')
  })
})
