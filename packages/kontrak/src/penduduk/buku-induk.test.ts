import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '../uji/contoh'
import type { Dusun } from '../wilayah/schema'
import { barisBukuInduk, KOLOM_BUKU_INDUK } from './buku-induk'
import type { Penduduk } from './schema'

const DUSUN: Dusun[] = [
  {
    id: 'dsn_ss_1', desaId: 'd', nomor: 1, nama: 'Kampung Tengah', kepalaDusun: 'A', posyandu: 'M',
    rw: [{ nomor: '002', ketua: 'D', rt: [{ nomor: '004', ketua: 'F' }] }],
  },
]
const ctx = { dusun: DUSUN, istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' } }
const baris = (ubah: Partial<Penduduk> = {}) => ({ ...contohPenduduk(ubah), nomorKk: '1405092011238004' })

describe('Buku Induk Penduduk (Permendagri 47/2016)', () => {
  it('16 kolom, satu baris per penduduk', () => {
    expect(KOLOM_BUKU_INDUK).toHaveLength(16)
    expect(barisBukuInduk(baris(), 7, ctx)).toEqual([
      '7', 'Siti Rahmah', 'Perempuan', 'Kawin Tercatat', 'Teluk Meranti', '12 Maret 1991', 'Islam', 'SLTA/Sederajat',
      'Mengurus Rumah Tangga', '', 'WNI', 'RT 004/RW 002, Dusun I Kampung Tengah', 'Istri', '1405095203918002',
      '1405092011238004', '',
    ])
  })
  it('keterangan: belum ada NIK, penduduk sementara, dan status bukan hidup', () => {
    const b = barisBukuInduk(baris({ nik: null, statusPenduduk: 'Sementara', statusDasar: 'Pindah' }), 1, ctx)
    expect(b[13]).toBe('')
    expect(b[15]).toBe('Belum ada NIK; Penduduk sementara; Pindah')
  })
})
