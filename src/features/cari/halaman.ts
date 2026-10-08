import { LABEL_PRESET, PRESET_PENDUDUK } from '@/domain/penduduk/filter'
import type { Kemampuan } from '@/domain/pengguna/hak-akses'

export type HalamanCari = { label: string; keterangan: string; href: string; kemampuan: Kemampuan | null }

/** Halaman dan aksi yang bisa dicari lewat Ctrl+K (SPEC §5.4). */
export const HALAMAN_CARI: readonly HalamanCari[] = [
  { label: 'Beranda', keterangan: 'Halaman', href: '/admin', kemampuan: null },
  { label: 'Penduduk', keterangan: 'Kependudukan', href: '/admin/kependudukan/penduduk', kemampuan: 'penduduk.lihat' },
  { label: 'Keluarga (KK)', keterangan: 'Kependudukan', href: '/admin/kependudukan/keluarga', kemampuan: 'penduduk.lihat' },
  { label: 'Tambah penduduk', keterangan: 'Aksi', href: '/admin/kependudukan/penduduk/tambah', kemampuan: 'penduduk.ubah' },
  ...PRESET_PENDUDUK.map(
    (p): HalamanCari => ({
      label: LABEL_PRESET[p],
      keterangan: 'Daftar penduduk',
      href: `/admin/kependudukan/penduduk?preset=${p}`,
      kemampuan: 'penduduk.lihat',
    }),
  ),
]
