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
})
