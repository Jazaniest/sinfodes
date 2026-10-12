import { describe, expect, it } from 'vitest'
import { DAFTAR_BUKU } from '@/domain/buku/schema'
import { bangkitkanDb } from '../generator'
import { PENYUSUN_BUKU } from './index'
import { bukuApbDesa, bukuInventarisHasil, bukuKader, bukuKegiatan, bukuRab, bukuRencanaKerja } from './tata-kelola'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))
const DESA = 'desa_sungai_sialang'
const cariBaris = (baris: string[][], uraian: string) => baris.find((b) => b[1] === uraian)

describe('buku administrasi keuangan dan pembangunan (SPEC Lampiran B)', () => {
  it('setiap buku yang bersumber otomatis punya penyusun, dan sebaliknya', () => {
    expect(Object.keys(PENYUSUN_BUKU).sort()).toEqual(DAFTAR_BUKU.filter((b) => b.sumber !== null).map((b) => b.kode).sort())
  })
  it('APB Desa: jumlah pendapatan, belanja, dan pembiayaan netto sama dengan APBDes; kekurangan realisasi ditulis dalam kurung', () => {
    const isi = bukuApbDesa(db, DESA)
    expect(cariBaris(isi.baris, 'Jumlah pendapatan')?.[2]).toBe('1.826.650.000')
    expect(cariBaris(isi.baris, 'Jumlah belanja')?.[2]).toBe('1.866.650.000')
    expect(cariBaris(isi.baris, 'Pembiayaan netto')?.slice(2)).toEqual(['40.000.000', '40.000.000', '0'])
    expect(cariBaris(isi.baris, 'Jumlah belanja')?.[4]).toMatch(/^\(\d{1,3}(\.\d{3})*\)$/)
    expect(isi.baris.map((b) => b[0]).filter((k) => k.startsWith('5.2'))).toEqual([
      '5.2', '5.2.01', '5.2.02', '5.2.03', '5.2.04', '5.2.05', '5.2.06', '5.2.07', '5.2.08',
    ])
    expect(isi.diperbarui).toBe(db.apbdes[0].sinkronPada)
  })
  it('RAB: 7 kegiatan dari rincian APBDes, lalu baris Jumlah Rp721.900.000', () => {
    const isi = bukuRab(db, DESA)
    expect(isi.baris).toHaveLength(8)
    expect(isi.baris[0].slice(0, 2)).toEqual(['5.2.01', 'Semenisasi jalan lingkungan Dusun III'])
    expect(isi.baris[7]).toEqual(['', 'Jumlah', '', '', '', '721.900.000'])
  })
  it('pembangunan: rencana kerja semua kegiatan; kegiatan yang sudah dimulai; hasil yang sudah selesai', () => {
    expect(bukuRencanaKerja(db, DESA).baris).toHaveLength(7)
    const kegiatan = bukuKegiatan(db, DESA).baris.map((b) => b[1])
    expect(kegiatan).toHaveLength(6)
    expect(kegiatan).not.toContain('Pelantar perahu nelayan')
    expect(bukuInventarisHasil(db, DESA).baris.map((b) => b[1])).toEqual([
      'Drainase RT 006–007', 'Rehabilitasi Posyandu Kenanga', 'Lampu jalan tenaga surya',
    ])
  })
  it('Kader Pemberdayaan Masyarakat: pengurus LPM, PKK, dan kader posyandu', () => {
    const isi = bukuKader(db, DESA)
    expect(isi.baris).toHaveLength(29)
    expect(isi.baris[0].slice(2, 4)).toEqual(['LPM', 'Ketua'])
    expect(new Set(isi.baris.map((b) => b[2]))).toEqual(new Set(['LPM', 'PKK', 'Kader Posyandu']))
  })
})
