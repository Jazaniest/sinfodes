import { describe, expect, it } from 'vitest'
import { buatAcak } from '@sinfodes/demo/prng'
import { samarkan, type SelSamar } from '@/domain/kabupaten/samaran'

const tersamar = (s: SelSamar) => typeof s === 'string'

describe('penyamaran angka di bawah 5 (SPEC-V0.2 §8.3 butir 6)', () => {
  it('angka 1-4 menjadi "<5"; satu-satunya sel tersamar di garis ikut dilengkapi sel terkecil berikutnya', () => {
    expect(samarkan([10, 3, 7], [[0, 1, 2]])).toEqual([10, '<5', '*'])
  })
  it('dua sel yang sudah tersamar tidak perlu pelengkap', () => {
    expect(samarkan([7, 3, 4], [[0, 1, 2]])).toEqual([7, '<5', '<5'])
  })
  it('0 tetap 0 dan tidak pernah dipilih sebagai pelengkap', () => {
    expect(samarkan([0, 0], [[0, 1]])).toEqual([0, 0])
    expect(samarkan([12, 3, 0, 9], [[0, 1, 2, 3]])).toEqual([12, '<5', 0, '*'])
  })
  it('induk tersamar bersama anaknya', () => {
    expect(samarkan([3, 3, 0], [[0, 1, 2]])).toEqual(['<5', '<5', 0])
  })
  it('pelengkap berantai: sel pelengkap di garis kolom membuat garis barisnya ikut dilengkapi', () => {
    // Tabel 2x2 dengan jumlah baris dan kolom:
    //   a=3  b=20 | 23
    //   c=30 d=40 | 70
    //   33   60   | 93
    const nilai = [3, 20, 30, 40, 23, 70, 33, 60, 93]
    const garis = [
      [4, 0, 1], [5, 2, 3], // baris
      [6, 0, 2], [7, 1, 3], // kolom
      [8, 4, 5], [8, 6, 7], // jumlah
    ]
    const hasil = samarkan(nilai, garis)
    expect(hasil[0]).toBe('<5')
    // Baris pertama dilengkapi b, kolom pertama dilengkapi c; lalu baris kedua dan kolom kedua dilengkapi d.
    expect([hasil[1], hasil[2], hasil[3]]).toEqual(['*', '*', '*'])
    expect([hasil[4], hasil[5], hasil[6], hasil[7], hasil[8]]).toEqual([23, 70, 33, 60, 93])
  })
  it('sifat: tidak ada angka 1-4, dan setiap garis yang induknya tampak punya 0 atau paling sedikit 2 sel tersamar', () => {
    const acak = buatAcak(1)
    for (let ulang = 0; ulang < 100; ulang++) {
      const anak = Array.from({ length: acak.bulat(2, 6) }, () => (acak.peluang(0.3) ? acak.bulat(0, 4) : acak.bulat(5, 60)))
      const nilai = [anak.reduce((n, x) => n + x, 0), ...anak]
      const garis = [nilai.map((_, i) => i)]
      const hasil = samarkan(nilai, garis)
      expect(hasil.some((s) => typeof s === 'number' && s >= 1 && s <= 4)).toBe(false)
      if (!tersamar(hasil[0])) {
        const jumlahTersamar = hasil.filter(tersamar).length
        const adaCalon = anak.some((x, i) => x > 0 && !tersamar(hasil[i + 1]))
        expect(jumlahTersamar === 0 || jumlahTersamar >= 2 || !adaCalon, JSON.stringify(nilai)).toBe(true)
      }
    }
  })
})
