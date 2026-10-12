import { describe, expect, it } from 'vitest'
import { HALAMAN_CARI } from './halaman'

describe('halaman di Ctrl+K (SPEC §5.4)', () => {
  it('Permohonan surat untuk peran yang boleh melihat surat', () =>
    expect(HALAMAN_CARI).toContainEqual({ label: 'Permohonan surat', keterangan: 'Layanan Surat', href: '/admin/surat', kemampuan: 'surat.lihat' }))
  it('aksi Buat surat untuk petugas loket; Tanda tangan surat untuk penanda tangan', () => {
    expect(HALAMAN_CARI).toContainEqual({ label: 'Buat surat', keterangan: 'Aksi', href: '/admin/surat/baru', kemampuan: 'surat.proses' })
    expect(HALAMAN_CARI).toContainEqual({
      label: 'Tanda tangan surat', keterangan: 'Layanan Surat', href: '/admin/surat/tanda-tangan', kemampuan: 'surat.tandatangani',
    })
  })
  it('Arsip surat, Jenis surat, dan Notifikasi bisa dicari (SPEC §5.4)', () => {
    expect(HALAMAN_CARI).toContainEqual({ label: 'Arsip surat', keterangan: 'Layanan Surat', href: '/admin/surat/arsip', kemampuan: 'surat.lihat' })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Jenis surat', keterangan: 'Layanan Surat', href: '/admin/surat/jenis', kemampuan: 'surat.lihat' })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Notifikasi', keterangan: 'Halaman', href: '/admin/notifikasi', kemampuan: null })
  })
  it('Pengaduan, Bantuan sosial, Kesehatan, dan saringan balita bisa dicari (3A)', () => {
    expect(HALAMAN_CARI).toContainEqual({ label: 'Pengaduan', keterangan: 'Halaman', href: '/admin/pengaduan', kemampuan: 'pengaduan.lihat' })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Bantuan sosial', keterangan: 'Halaman', href: '/admin/bansos', kemampuan: 'bansos.lihat' })
    expect(HALAMAN_CARI).toContainEqual({
      label: 'Kesehatan dan posyandu', keterangan: 'Halaman', href: '/admin/kesehatan', kemampuan: 'kesehatan.lihat',
    })
    expect(HALAMAN_CARI).toContainEqual({
      label: 'Balita pendek (stunting)', keterangan: 'Kesehatan', href: '/admin/kesehatan?status=pendek', kemampuan: 'kesehatan.lihat',
    })
  })
  it('halaman Tata kelola dan Peta desa bisa dicari (3B)', () => {
    expect(HALAMAN_CARI).toContainEqual({ label: 'APBDes dan keuangan', keterangan: 'Halaman', href: '/admin/keuangan', kemampuan: 'keuangan.lihat' })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Aset desa', keterangan: 'Halaman', href: '/admin/aset', kemampuan: 'aset.lihat' })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Peta desa', keterangan: 'Halaman', href: '/admin/peta', kemampuan: null })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Lembaga desa', keterangan: 'Halaman', href: '/admin/lembaga', kemampuan: null })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Pembangunan', keterangan: 'Halaman', href: '/admin/pembangunan', kemampuan: null })
  })
  it('halaman Buku Administrasi, Website Desa, dan Pengaturan bisa dicari (3C)', () => {
    expect(HALAMAN_CARI).toContainEqual({ label: 'Buku administrasi', keterangan: 'Halaman', href: '/admin/buku', kemampuan: 'buku.lihat' })
    expect(HALAMAN_CARI).toContainEqual({ label: 'Tampilan website', keterangan: 'Website Desa', href: '/admin/website/tampilan', kemampuan: 'website.kelola' })
    expect(HALAMAN_CARI).toContainEqual({
      label: 'Pengguna dan peran', keterangan: 'Pengaturan', href: '/admin/pengaturan/pengguna', kemampuan: 'pengguna.kelola',
    })
    expect(HALAMAN_CARI).toContainEqual({
      label: 'Penomoran surat', keterangan: 'Pengaturan', href: '/admin/pengaturan/penomoran', kemampuan: 'pengaturan.kelola',
    })
    expect(new Set(HALAMAN_CARI.map((h) => h.href)).size).toBe(HALAMAN_CARI.length)
  })
})
