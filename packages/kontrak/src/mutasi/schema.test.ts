import { describe, expect, it } from 'vitest'
import { mutasiSchema } from './schema'

const dasar = {
  id: 'mts_contoh',
  desaId: 'desa_sungai_sialang',
  tanggal: '2026-09-20',
  pendudukIds: ['pdk_contoh'],
  dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' },
  dicatatPada: '2026-09-21T09:12:00+07:00',
}
const rincianLahir = {
  jam: '04:35', tempatDilahirkan: 'Puskesmas', tempatLahir: 'Teluk Meranti', jenisKelahiran: 'Tunggal', anakKe: 2,
  penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49, ibuId: 'pdk_ibu', ayahId: null, pelapor: 'Syahrial',
}

describe('mutasiSchema (SPEC §6.1, §6.6)', () => {
  it('kelahiran valid', () =>
    expect(mutasiSchema.safeParse({ ...dasar, jenis: 'lahir', rincian: rincianLahir }).success).toBe(true))
  it('jam tidak valid ditolak', () =>
    expect(mutasiSchema.safeParse({ ...dasar, jenis: 'lahir', rincian: { ...rincianLahir, jam: '25:00' } }).success).toBe(false))
  it('rincian harus sesuai jenis', () =>
    expect(mutasiSchema.safeParse({ ...dasar, jenis: 'meninggal', rincian: rincianLahir }).success).toBe(false))
  it('pindah membawa alamat tujuan lengkap', () => {
    const tujuan = { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: '' }
    expect(mutasiSchema.safeParse({ ...dasar, jenis: 'pindah', rincian: { tujuan, alasan: 'Pekerjaan' } }).success).toBe(true)
    expect(
      mutasiSchema.safeParse({ ...dasar, jenis: 'pindah', rincian: { tujuan: { ...tujuan, desa: '' }, alasan: 'Pekerjaan' } }).success,
    ).toBe(false)
  })
})
