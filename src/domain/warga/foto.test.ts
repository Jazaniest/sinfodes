import { describe, expect, it } from 'vitest'
import { periksaFotoKirim, ukuranKb, ukuranKecil } from './foto'

describe('foto dari HP (SPEC §10, fokus review 2)', () => {
  it('sisi terpanjang menjadi 1600px dengan perbandingan tetap; foto kecil tidak diperbesar', () => {
    expect(ukuranKecil(4000, 3000)).toEqual({ lebar: 1600, tinggi: 1200 })
    expect(ukuranKecil(3024, 4032)).toEqual({ lebar: 1200, tinggi: 1600 })
    expect(ukuranKecil(800, 600)).toEqual({ lebar: 800, tinggi: 600 })
  })
  it('ukuran dalam KB dibulatkan ke atas, paling kecil 1', () => {
    expect(ukuranKb(1)).toBe(1)
    expect(ukuranKb(300 * 1024 + 1)).toBe(301)
  })
  it('API hanya menerima foto JPG, PNG, atau WebP yang sudah dikecilkan', () => {
    expect(periksaFotoKirim({ type: 'image/jpeg', size: 400 * 1024 })).toBeNull()
    expect(periksaFotoKirim({ type: 'application/pdf', size: 400 * 1024 })).toBe('Lampiran harus berupa foto (JPG, PNG, atau WebP).')
    expect(periksaFotoKirim({ type: 'image/jpeg', size: 3 * 1024 * 1024 })).toBe('Foto terlalu besar sesudah dikecilkan (paling besar 2 MB).')
  })
})
