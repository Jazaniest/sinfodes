import { describe, expect, it } from 'vitest'
import { filterMutasiSchema, hitungMutasiBulan, kalimatRingkasanMutasi, rincianMutasi } from './buku'
import type { Mutasi } from './schema'

describe('Buku Mutasi (SPEC §6.6)', () => {
  it('jumlah kejadian per jenis pada satu bulan', () => {
    const daftar = [
      { jenis: 'lahir', tanggal: '2026-09-02' },
      { jenis: 'lahir', tanggal: '2026-08-30' },
      { jenis: 'pindah', tanggal: '2026-09-15' },
    ] as const
    expect(hitungMutasiBulan(daftar, '2026-09')).toEqual({ lahir: 1, meninggal: 0, pindah: 1, datang: 0 })
  })
  it('kalimat ringkasan bulan', () => {
    expect(kalimatRingkasanMutasi({ bulan: '2026-09', lahir: 3, meninggal: 1, datang: 2, pindah: 4 })).toBe(
      'September 2026: 3 lahir · 1 meninggal · 2 datang · 4 pindah',
    )
  })
  it('rincian singkat per jenis', () => {
    const pindah = {
      id: 'mts_a', desaId: 'desa_sungai_sialang', jenis: 'pindah', tanggal: '2026-09-15', pendudukIds: ['pdk_a'],
      dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, dicatatPada: '2026-09-15T09:00:00+07:00',
      rincian: { tujuan: { provinsi: 'Riau', kabupaten: 'Kota Dumai', kecamatan: 'Dumai Barat', desa: 'Purnama', alamat: '' }, alasan: 'Pekerjaan' },
    } satisfies Mutasi
    expect(rincianMutasi(pindah)).toBe('Ke Kota Dumai · Pekerjaan')
  })
  it('filter dari URL: bulan harus YYYY-MM', () => {
    expect(filterMutasiSchema.safeParse({ bulan: '2026-9' }).success).toBe(false)
    expect(filterMutasiSchema.parse({ jenis: 'lahir', bulan: '2026-09' })).toEqual({ jenis: 'lahir', bulan: '2026-09', page: 1, pageSize: 25 })
  })
})
