import { LABEL_PRESET, PRESET_PENDUDUK } from '@/domain/penduduk/filter'
import type { Kemampuan } from '@/domain/pengguna/hak-akses'

export type HalamanCari = { label: string; keterangan: string; href: string; kemampuan: Kemampuan | null }

/** Halaman dan pintasan yang bisa dicari lewat Ctrl+K (SPEC §5.4). Aksi tambah/catat ditambahkan di 2A-2. */
export const HALAMAN_CARI: readonly HalamanCari[] = [
  { label: 'Beranda', keterangan: 'Halaman', href: '/admin', kemampuan: null },
  { label: 'Penduduk', keterangan: 'Kependudukan', href: '/admin/kependudukan/penduduk', kemampuan: 'penduduk.lihat' },
  { label: 'Keluarga (KK)', keterangan: 'Kependudukan', href: '/admin/kependudukan/keluarga', kemampuan: 'penduduk.lihat' },
  ...PRESET_PENDUDUK.map(
    (p): HalamanCari => ({
      label: LABEL_PRESET[p],
      keterangan: 'Daftar penduduk',
      href: `/admin/kependudukan/penduduk?preset=${p}`,
      kemampuan: 'penduduk.lihat',
    }),
  ),
]
