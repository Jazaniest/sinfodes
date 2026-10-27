import { describe, expect, it } from 'vitest'
import type { Keadaan } from '@/domain/beranda/schema'
import { isiSuratSaya, isiTindakan, kalimatKeadaan } from './kalimat'

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

describe('kalimat keadaan desa (SPEC §5.3)', () => {
  const keadaan: Keadaan = {
    cakupan: 'desa', dusunId: null, jiwa: 2812, kk: 806, laki: 1410, perempuan: 1402,
    bulanIni: { lahir: 3, meninggal: 1, datang: 2, pindah: 4 },
    surat: { terbit30Hari: 64, rataSelesaiHariKerja: 1 },
  }
  it('penduduk, mutasi bulan ini, lalu surat 30 hari terakhir', () =>
    expect(kalimatKeadaan(keadaan)).toBe(
      '2.812 jiwa dalam 806 KK · bulan ini 3 lahir, 1 meninggal, 2 datang, 4 pindah · 64 surat terbit dalam 30 hari terakhir, rata-rata selesai 1 hari kerja',
    ))
  it('selesai di hari yang sama; belum ada surat terbit', () => {
    expect(kalimatKeadaan({ ...keadaan, surat: { terbit30Hari: 5, rataSelesaiHariKerja: 0 } })).toMatch(
      / · 5 surat terbit dalam 30 hari terakhir, rata-rata selesai di hari yang sama$/,
    )
    expect(kalimatKeadaan({ ...keadaan, surat: { terbit30Hari: 0, rataSelesaiHariKerja: 0 } })).toMatch(
      / · belum ada surat terbit dalam 30 hari terakhir$/,
    )
  })
})

describe('bagian tanda tangan di Beranda (SPEC §5.3)', () => {
  it('Kades: Mulai tanda tangani membuka tumpukan tanda tangan', () =>
    expect(isiSuratSaya({ tahap: 'tanda-tangan', jumlah: 2 })).toEqual({
      judul: 'Menunggu tanda tangan Anda (2)',
      tautan: { teks: 'Mulai tanda tangani', href: '/admin/surat/tanda-tangan' },
    }))
  it('Sekdes: paraf dikerjakan dari daftar Perlu TTD; tanpa tautan bila kosong', () => {
    expect(isiSuratSaya({ tahap: 'paraf', jumlah: 1 })).toEqual({
      judul: 'Perlu paraf Anda (1)',
      tautan: { teks: 'Lihat surat yang perlu diparaf', href: '/admin/surat?status=perlu-ttd' },
    })
    expect(isiSuratSaya({ tahap: 'paraf', jumlah: 0 })).toEqual({ judul: 'Perlu paraf Anda (0)', tautan: null })
  })
})
