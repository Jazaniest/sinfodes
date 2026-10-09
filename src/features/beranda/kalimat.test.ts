import { describe, expect, it } from 'vitest'
import { isiTindakan } from './kalimat'

describe('butir Perlu ditindaklanjuti (SPEC §5.3)', () => {
  it('kelahiran dari warga membuka alur Lahir dengan laporannya', () =>
    expect(isiTindakan({ jenis: 'kelahiran-dilaporkan', jumlah: 1, laporanId: 'lap_kelahiran_rosnani' })).toEqual({
      teks: '1 kelahiran dilaporkan warga, belum dicatat',
      href: '/admin/kependudukan/mutasi/lahir?laporan=lap_kelahiran_rosnani',
    }))
  it('laporan perbaikan membuka profil penduduk pada laporan terlama', () =>
    expect(isiTindakan({ jenis: 'laporan-perbaikan', jumlah: 2, pendudukId: 'pdk_syahrial' })).toEqual({
      teks: '2 laporan perbaikan data dari warga',
      href: '/admin/kependudukan/penduduk/pdk_syahrial',
    }))
  it('permohonan menunggu membuka daftar permohonan; umur yang tertua dalam hari kerja', () => {
    expect(isiTindakan({ jenis: 'permohonan-menunggu', jumlah: 7, tertuaHariKerja: 2 })).toEqual({
      teks: '7 permohonan surat menunggu (tertua 2 hari kerja)',
      href: '/admin/surat',
    })
    expect(isiTindakan({ jenis: 'permohonan-menunggu', jumlah: 1, tertuaHariKerja: 0 }).teks).toBe('1 permohonan surat menunggu (masuk hari ini)')
  })
  it('surat yang dikembalikan membuka ruang kerja surat terlama', () =>
    expect(isiTindakan({ jenis: 'surat-dikembalikan', jumlah: 1, permohonanId: 'srt_contoh', ringkas: 'SKU · Zulkifli' })).toEqual({
      teks: '1 surat dikembalikan untuk diperbaiki (SKU · Zulkifli)',
      href: '/admin/surat/srt_contoh',
    }))
})
