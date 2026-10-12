import { LABEL_PRESET, PRESET_PENDUDUK } from '@/domain/penduduk/filter'
import type { Kemampuan } from '@/domain/pengguna/hak-akses'

export type HalamanCari = { label: string; keterangan: string; href: string; kemampuan: Kemampuan | null }

/** Halaman dan aksi yang bisa dicari lewat Ctrl+K (SPEC §5.4). */
export const HALAMAN_CARI: readonly HalamanCari[] = [
  { label: 'Beranda', keterangan: 'Halaman', href: '/admin', kemampuan: null },
  { label: 'Permohonan surat', keterangan: 'Layanan Surat', href: '/admin/surat', kemampuan: 'surat.lihat' },
  { label: 'Buat surat', keterangan: 'Aksi', href: '/admin/surat/baru', kemampuan: 'surat.proses' },
  { label: 'Tanda tangan surat', keterangan: 'Layanan Surat', href: '/admin/surat/tanda-tangan', kemampuan: 'surat.tandatangani' },
  { label: 'Arsip surat', keterangan: 'Layanan Surat', href: '/admin/surat/arsip', kemampuan: 'surat.lihat' },
  { label: 'Jenis surat', keterangan: 'Layanan Surat', href: '/admin/surat/jenis', kemampuan: 'surat.lihat' },
  { label: 'Pengaduan', keterangan: 'Halaman', href: '/admin/pengaduan', kemampuan: 'pengaduan.lihat' },
  { label: 'Notifikasi', keterangan: 'Halaman', href: '/admin/notifikasi', kemampuan: null },
  { label: 'Penduduk', keterangan: 'Kependudukan', href: '/admin/kependudukan/penduduk', kemampuan: 'penduduk.lihat' },
  { label: 'Keluarga (KK)', keterangan: 'Kependudukan', href: '/admin/kependudukan/keluarga', kemampuan: 'penduduk.lihat' },
  { label: 'Tambah penduduk', keterangan: 'Aksi', href: '/admin/kependudukan/penduduk/tambah', kemampuan: 'penduduk.ubah' },
  { label: 'Impor penduduk dari Excel', keterangan: 'Aksi', href: '/admin/kependudukan/penduduk/impor', kemampuan: 'penduduk.ubah' },
  { label: 'Mutasi', keterangan: 'Kependudukan', href: '/admin/kependudukan/mutasi', kemampuan: 'penduduk.lihat' },
  { label: 'Statistik penduduk', keterangan: 'Kependudukan', href: '/admin/kependudukan/statistik', kemampuan: 'penduduk.lihat' },
  { label: 'Bantuan sosial', keterangan: 'Halaman', href: '/admin/bansos', kemampuan: 'bansos.lihat' },
  { label: 'Kesehatan dan posyandu', keterangan: 'Halaman', href: '/admin/kesehatan', kemampuan: 'kesehatan.lihat' },
  { label: 'Balita perlu pemantauan', keterangan: 'Kesehatan', href: '/admin/kesehatan?status=perlu-pemantauan', kemampuan: 'kesehatan.lihat' },
  { label: 'Balita pendek (stunting)', keterangan: 'Kesehatan', href: '/admin/kesehatan?status=pendek', kemampuan: 'kesehatan.lihat' },
  { label: 'Peta desa', keterangan: 'Halaman', href: '/admin/peta', kemampuan: null },
  { label: 'APBDes dan keuangan', keterangan: 'Halaman', href: '/admin/keuangan', kemampuan: 'keuangan.lihat' },
  { label: 'Pembangunan', keterangan: 'Halaman', href: '/admin/pembangunan', kemampuan: null },
  { label: 'Aset desa', keterangan: 'Halaman', href: '/admin/aset', kemampuan: 'aset.lihat' },
  { label: 'Lembaga desa', keterangan: 'Halaman', href: '/admin/lembaga', kemampuan: null },
  { label: 'Buku administrasi', keterangan: 'Halaman', href: '/admin/buku', kemampuan: 'buku.lihat' },
  { label: 'Website desa', keterangan: 'Halaman', href: '/admin/website', kemampuan: 'website.kelola' },
  { label: 'Tampilan website', keterangan: 'Website Desa', href: '/admin/website/tampilan', kemampuan: 'website.kelola' },
  { label: 'Pengaturan desa', keterangan: 'Halaman', href: '/admin/pengaturan', kemampuan: 'pengaturan.kelola' },
  { label: 'Wilayah dan RT/RW', keterangan: 'Pengaturan', href: '/admin/pengaturan/wilayah', kemampuan: 'pengaturan.kelola' },
  { label: 'Pengguna dan peran', keterangan: 'Pengaturan', href: '/admin/pengaturan/pengguna', kemampuan: 'pengguna.kelola' },
  { label: 'Penomoran surat', keterangan: 'Pengaturan', href: '/admin/pengaturan/penomoran', kemampuan: 'pengaturan.kelola' },
  { label: 'Catat kelahiran', keterangan: 'Aksi', href: '/admin/kependudukan/mutasi/lahir', kemampuan: 'penduduk.ubah' },
  { label: 'Catat kematian', keterangan: 'Aksi', href: '/admin/kependudukan/mutasi/meninggal', kemampuan: 'penduduk.ubah' },
  { label: 'Catat pindah keluar', keterangan: 'Aksi', href: '/admin/kependudukan/mutasi/pindah', kemampuan: 'penduduk.ubah' },
  { label: 'Catat kedatangan', keterangan: 'Aksi', href: '/admin/kependudukan/mutasi/datang', kemampuan: 'penduduk.ubah' },
  ...PRESET_PENDUDUK.map(
    (p): HalamanCari => ({
      label: LABEL_PRESET[p],
      keterangan: 'Daftar penduduk',
      href: `/admin/kependudukan/penduduk?preset=${p}`,
      kemampuan: 'penduduk.lihat',
    }),
  ),
]
