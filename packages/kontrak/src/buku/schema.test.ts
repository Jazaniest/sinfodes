import { describe, expect, it } from 'vitest'
import { bukuBoleh, cariBuku, DAFTAR_BUKU, KELOMPOK_BUKU } from './schema'

describe('Buku Administrasi (SPEC §8, Lampiran B)', () => {
  it('24 buku Permendagri 47/2016 dalam 4 kelompok; 15 bersumber otomatis, 9 diisi manual', () => {
    expect(DAFTAR_BUKU).toHaveLength(24)
    expect(KELOMPOK_BUKU.map((k) => DAFTAR_BUKU.filter((b) => b.kelompok === k).length)).toEqual([9, 5, 6, 4])
    expect(DAFTAR_BUKU.filter((b) => b.sumber !== null)).toHaveLength(15)
    expect(new Set(DAFTAR_BUKU.map((b) => b.kode)).size).toBe(24)
    expect(cariBuku('induk-penduduk')).toMatchObject({ nama: 'Buku Induk Penduduk', kelompok: 'penduduk', sumber: 'Kependudukan' })
    expect(cariBuku('tidak-ada')).toBeUndefined()
  })
  it('hak lihat: Kaur Keuangan hanya buku keuangan; Kepala Dusun tidak ada (fokus review 1)', () => {
    expect(KELOMPOK_BUKU.filter((k) => bukuBoleh('kaur-keuangan', k))).toEqual(['keuangan'])
    expect(KELOMPOK_BUKU.filter((k) => bukuBoleh('kadus', k))).toEqual([])
    for (const peran of ['operator', 'sekdes', 'kades'] as const) expect(KELOMPOK_BUKU.every((k) => bukuBoleh(peran, k))).toBe(true)
  })
})
