import { describe, expect, it } from 'vitest'
import { buatKunciDataBaru, buatPenyandi, GalatKripto } from './penyandi'

const kunci = (awal: number) => Buffer.from(Array.from({ length: 32 }, (_, i) => (awal + i * 13) % 256))
const UTAMA = kunci(5)
const INDEKS = kunci(71)

const rakit = (kidAktif = 'k1', kid: string[] = ['k1'], utama = UTAMA, indeks = INDEKS) =>
  buatPenyandi(utama, kid.map((k) => buatKunciDataBaru(UTAMA, k)), kidAktif, indeks)

describe('penyandi: enkripsi', () => {
  it('pulang-pergi mengembalikan nilai asli', () => {
    const p = rakit()
    expect(p.bukaSandi(p.sandikan('1405095203918002', 'penduduk.nik:desa_a'), 'penduduk.nik:desa_a')).toBe('1405095203918002')
    expect(p.bukaSandi(p.sandikan('', 'x'), 'x')).toBe('')
    expect(p.bukaSandi(p.sandikan('Bapak Sulaiman, Dusun II — ñ', 'x'), 'x')).toBe('Bapak Sulaiman, Dusun II — ñ')
  })

  it('nilai sama dua kali menghasilkan sandi berbeda (IV acak)', () => {
    const p = rakit()
    expect(p.sandikan('1405095203918002', 'r')).not.toBe(p.sandikan('1405095203918002', 'r'))
  })

  it('bentuk sandi v1.<kid>.<iv>.<teks>.<tag> dan tanpa nilai asli', () => {
    const p = rakit()
    const sandi = p.sandikan('1405095203918002', 'r')
    const bagian = sandi.split('.')
    expect(bagian).toHaveLength(5)
    expect(bagian[0]).toBe('v1')
    expect(bagian[1]).toBe('k1')
    expect(sandi).not.toContain('1405095203918002')
  })

  it('ruang berbeda tidak bisa membuka (data tambahan terautentikasi)', () => {
    const p = rakit()
    const sandi = p.sandikan('1405095203918002', 'penduduk.nik:desa_a')
    expect(() => p.bukaSandi(sandi, 'penduduk.nik:desa_b')).toThrow(GalatKripto)
  })

  it('sandi yang diubah satu karakter ditolak', () => {
    const p = rakit()
    const bagian = p.sandikan('1405095203918002', 'r').split('.')
    const teks = bagian[3]
    bagian[3] = (teks[0] === 'A' ? 'B' : 'A') + teks.slice(1)
    expect(() => p.bukaSandi(bagian.join('.'), 'r')).toThrow(GalatKripto)
  })

  it('bentuk sandi yang salah ditolak dengan galat netral', () => {
    const p = rakit()
    for (const buruk of ['', 'abc', 'v2.k1.a.b.c', 'v1.k9.a.b.c']) {
      expect(() => p.bukaSandi(buruk, 'r')).toThrow(GalatKripto)
    }
    try {
      p.bukaSandi(p.sandikan('1405095203918002', 'a'), 'b')
    } catch (e) {
      expect((e as Error).message).not.toContain('1405095203918002')
      expect((e as Error).message).toBe('Data terenkripsi tidak dapat dibuka.')
    }
  })

  it('kid ikut sandi: kunci diputar tanpa mengenkripsi ulang', () => {
    const lama = rakit('k1', ['k1'])
    const sandiLama = lama.sandikan('1405095203918002', 'r')
    // Baris kunci_data k1 harus sama dengan yang dipakai `lama`; bangun ulang dari baris yang sama.
    const k1 = buatKunciDataBaru(UTAMA, 'k1')
    const k2 = buatKunciDataBaru(UTAMA, 'k2')
    const a = buatPenyandi(UTAMA, [k1], 'k1', INDEKS)
    const s1 = a.sandikan('1405095203918002', 'r')
    const b = buatPenyandi(UTAMA, [k1, k2], 'k2', INDEKS)
    expect(b.bukaSandi(s1, 'r')).toBe('1405095203918002')
    const s2 = b.sandikan('1405095203918002', 'r')
    expect(s2.split('.')[1]).toBe('k2')
    expect(() => a.bukaSandi(s2, 'r')).toThrow(GalatKripto)
    expect(sandiLama.split('.')[1]).toBe('k1')
  })

  it('kunci data dibungkus: baris tidak memuat kunci polos dan tidak terbuka dengan kunci utama lain', () => {
    const baris = buatKunciDataBaru(UTAMA, 'k1')
    expect(baris.kid).toBe('k1')
    expect(baris.dibungkus.startsWith('v1.')).toBe(true)
    expect(() => buatPenyandi(kunci(200), [baris], 'k1', INDEKS)).toThrow(GalatKripto)
  })

  it('kid aktif yang tidak ada di baris kunci ditolak', () => {
    expect(() => buatPenyandi(UTAMA, [buatKunciDataBaru(UTAMA, 'k1')], 'k2', INDEKS)).toThrow(GalatKripto)
  })
})

describe('penyandi: indeks pencarian persis', () => {
  it('stabil untuk nilai dan ruang yang sama', () => {
    const p = rakit()
    expect(p.indeks('1405095203918002', 'penduduk.nik:desa_a')).toBe(p.indeks('1405095203918002', 'penduduk.nik:desa_a'))
  })

  it('berbeda untuk ruang berbeda (NIK sama di dua desa) dan nilai berbeda', () => {
    const p = rakit()
    expect(p.indeks('1405095203918002', 'penduduk.nik:desa_a')).not.toBe(p.indeks('1405095203918002', 'penduduk.nik:desa_b'))
    expect(p.indeks('1405095203918002', 'r')).not.toBe(p.indeks('1405095203918003', 'r'))
  })

  it('tidak bergantung pada kunci utama, hanya pada kunci indeks', () => {
    const a = rakit('k1', ['k1'], UTAMA, INDEKS)
    const lain = buatPenyandi(kunci(150), [buatKunciDataBaru(kunci(150), 'k1')], 'k1', INDEKS)
    expect(lain.indeks('1405095203918002', 'r')).toBe(a.indeks('1405095203918002', 'r'))
    const beda = buatPenyandi(UTAMA, [buatKunciDataBaru(UTAMA, 'k1')], 'k1', kunci(33))
    expect(beda.indeks('1405095203918002', 'r')).not.toBe(a.indeks('1405095203918002', 'r'))
  })

  it('tidak memuat nilai asli', () => {
    expect(rakit().indeks('1405095203918002', 'r')).not.toContain('1405095203918002')
  })
})
