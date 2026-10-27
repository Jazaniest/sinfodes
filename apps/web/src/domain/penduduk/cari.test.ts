import { describe, expect, it } from 'vitest'
import { cocokNama, cocokPenduduk, kataAngka, kataCukup, normalisasi } from './cari'

const siti = { nama: 'Siti Rahmah', nik: '1405095203918002' }

describe('pencarian penduduk (SPEC §5.4, §6.2)', () => {
  it('normalisasi: huruf kecil, tanpa diakritik, spasi tunggal', () => expect(normalisasi('  Ṣiti   RAHMAH ')).toBe('siti rahmah'))
  it('kata angka boleh dipisah spasi, titik, atau strip', () => {
    expect(kataAngka('140509 5203.91-8002')).toBe('1405095203918002')
    expect(kataAngka('Siti 12')).toBeNull()
  })
  it('nama: semua potongan harus ada, urutan bebas', () => {
    expect(cocokNama('Siti Rahmah', 'rah siti')).toBe(true)
    expect(cocokNama('Siti Rahmah', 'siti aminah')).toBe(false)
  })
  it('NIK minimal 4 digit', () => {
    expect(cocokPenduduk(siti, '8002', '')).toBe(true)
    expect(cocokPenduduk(siti, '800', '')).toBe(false)
  })
  it('potongan nomor KK', () => expect(cocokPenduduk(siti, '2011238004', '1405092011238004')).toBe(true))
  it('kata cukup: nama ≥ 2 huruf, angka ≥ 4 digit', () => {
    expect(kataCukup('s')).toBe(false)
    expect(kataCukup('si')).toBe(true)
    expect(kataCukup('140')).toBe(false)
    expect(kataCukup('1405')).toBe(true)
  })
})
