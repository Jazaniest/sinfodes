import { LABEL_PRESET, PRESET_PENDUDUK } from '@/domain/penduduk/filter'
import type { Kemampuan } from '@/domain/pengguna/hak-akses'

export type HalamanCari = { label: string; keterangan: string; href: string; kemampuan: Kemampuan | null }

/** Halaman dan aksi yang bisa dicari lewat Ctrl+K (SPEC §5.4). */
export const HALAMAN_CARI: readonly HalamanCari[] = [
  { label: 'Beranda', keterangan: 'Halaman', href: '/admin', kemampuan: null },
  { label: 'Permohonan surat', keterangan: 'Layanan Surat', href: '/admin/surat', kemampuan: 'surat.lihat' },
  { label: 'Buat surat', keterangan: 'Aksi', href: '/admin/surat/baru', kemampuan: 'surat.proses' },
  { label: 'Tanda tangan surat', keterangan: 'Layanan Surat', href: '/admin/surat/tanda-tangan', kemampuan: 'surat.tandatangani' },
  { label: 'Penduduk', keterangan: 'Kependudukan', href: '/admin/kependudukan/penduduk', kemampuan: 'penduduk.lihat' },
  { label: 'Keluarga (KK)', keterangan: 'Kependudukan', href: '/admin/kependudukan/keluarga', kemampuan: 'penduduk.lihat' },
  { label: 'Tambah penduduk', keterangan: 'Aksi', href: '/admin/kependudukan/penduduk/tambah', kemampuan: 'penduduk.ubah' },
  { label: 'Impor penduduk dari Excel', keterangan: 'Aksi', href: '/admin/kependudukan/penduduk/impor', kemampuan: 'penduduk.ubah' },
  { label: 'Mutasi', keterangan: 'Kependudukan', href: '/admin/kependudukan/mutasi', kemampuan: 'penduduk.lihat' },
  { label: 'Statistik penduduk', keterangan: 'Kependudukan', href: '/admin/kependudukan/statistik', kemampuan: 'penduduk.lihat' },
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
