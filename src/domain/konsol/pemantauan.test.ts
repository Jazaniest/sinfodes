import { describe, expect, it } from 'vitest'
import { keCsv } from '../format/csv'
import {
  barisCsvPemantauan, barisPemantauanDesaSchema, bulatJam, median, rasioApbdes, ringkasWilayah, type BarisPemantauanDesa,
  type Pemantauan,
} from './pemantauan'

const desa = (ubah: Partial<BarisPemantauanDesa>): BarisPemantauanDesa => ({
  id: 'desa_x', nama: 'Desa X', status: 'Aktif', suratBulanIni: 0, waktuLayananJam: null, jiwa: 0, kelengkapan: null,
  waktuTanggapanJam: null, apbdes: null, ...ubah,
})

describe('Pemantauan wilayah (SPEC §11 layar 5)', () => {
  it('median: kosong → null, ganjil → nilai tengah, genap → rata-rata dua nilai tengah', () => {
    expect(median([])).toBeNull()
    expect(median([5])).toBe(5)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(bulatJam(26.449)).toBe(26.4)
    expect(bulatJam(null)).toBeNull()
  })
  it('angka gabungan: adopsi, jumlah surat, median dari median desa, kelengkapan ditimbang jiwa, realisasi dari jumlah', () => {
    const r = ringkasWilayah([
      desa({ status: 'Aktif', suratBulanIni: 30, waktuLayananJam: 20, jiwa: 1000, kelengkapan: 0.9, waktuTanggapanJam: 10, apbdes: { anggaran: 1000, realisasi: 600 } }),
      desa({ status: 'Aktif', suratBulanIni: 10, waktuLayananJam: 40, jiwa: 3000, kelengkapan: 0.8, apbdes: { anggaran: 3000, realisasi: 1500 } }),
      desa({ status: 'Persiapan' }),
      desa({ status: 'Uji coba', suratBulanIni: 5, waktuLayananJam: 30, jiwa: 1000, kelengkapan: 0.5, waktuTanggapanJam: 30 }),
    ])
    expect(r).toEqual({
      jumlahDesa: 4,
      adopsi: { aktif: 2, ujiCoba: 1, persiapan: 1, ditangguhkan: 0 },
      suratBulanIni: 45,
      waktuLayananJam: 30,
      kelengkapan: 0.76,
      waktuTanggapanJam: 20,
      realisasiApbdes: 0.525,
    })
  })
  it('wilayah yang semua desanya belum berdata: angka null, bukan NaN atau 0 (fokus review 3)', () => {
    const r = ringkasWilayah([desa({ status: 'Persiapan' }), desa({ status: 'Ditangguhkan' })])
    expect(r).toMatchObject({ suratBulanIni: 0, waktuLayananJam: null, kelengkapan: null, waktuTanggapanJam: null, realisasiApbdes: null })
    expect(ringkasWilayah([])).toMatchObject({ jumlahDesa: 0, kelengkapan: null })
    expect(rasioApbdes(null)).toBeNull()
    expect(rasioApbdes({ anggaran: 0, realisasi: 0 })).toBeNull()
  })
  it('baris desa hanya berisi angka agregat; field lain, mis. NIK, membuat datanya tidak sah (fokus review 1)', () => {
    const sah = desa({ nama: 'Sungai Sialang' })
    expect(barisPemantauanDesaSchema.parse(sah)).toEqual(sah)
    expect(barisPemantauanDesaSchema.safeParse({ ...sah, nik: '1405095203918002' }).success).toBe(false)
  })
  it('CSV: satu baris per desa, desimal koma, sel kosong bila tidak ada angka (fokus review 4)', () => {
    const ss = desa({ nama: 'Sungai Sialang', suratBulanIni: 12, waktuLayananJam: 30.46, jiwa: 2812, kelengkapan: 0.9957, waktuTanggapanJam: 20, apbdes: { anggaran: 2000, realisasi: 1200 } })
    const tl = desa({ nama: 'Tanjung Lamo', status: 'Persiapan' })
    const p: Pemantauan = {
      wilayah: { kode: '14.05', nama: 'Pelalawan' },
      bulan: '2026-09',
      total: ringkasWilayah([ss, tl]),
      kecamatan: [
        { kecamatan: { kode: '14.05.10', nama: 'Kuala Kampar' }, ...ringkasWilayah([tl]), desa: [tl] },
        { kecamatan: { kode: '14.05.09', nama: 'Teluk Meranti' }, ...ringkasWilayah([ss]), desa: [ss] },
      ],
    }
    const baris = keCsv(barisCsvPemantauan(p)).split('\r\n')
    expect(baris[0]).toBe(
      '﻿Kecamatan;Desa;Status;Surat terbit bulan ini;Median waktu layanan (jam);Kelengkapan data (%);Median tanggapan pengaduan (jam);Realisasi APBDes (%)',
    )
    expect(baris[1]).toBe('Kuala Kampar;Tanjung Lamo;Persiapan;0;;;;')
    expect(baris[2]).toBe('Teluk Meranti;Sungai Sialang;Aktif;12;30,5;99,6;20,0;60,0')
    expect(baris).toHaveLength(4)
  })
})
