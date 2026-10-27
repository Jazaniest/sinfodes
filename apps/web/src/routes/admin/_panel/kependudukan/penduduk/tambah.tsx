import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { HalamanTambahPenduduk } from '@/features/penduduk/HalamanTambahPenduduk'

export const Route = createFileRoute('/admin/_panel/kependudukan/penduduk/tambah')({
  // `keluarga` berisi ID internal KK (bukan nomor KK) untuk "Tambah anggota". Nilai lain diabaikan.
  validateSearch: (cari: { keluarga?: unknown } & SearchSchemaInput): { keluarga?: string } =>
    typeof cari.keluarga === 'string' && /^kk_[a-z0-9_]+$/.test(cari.keluarga) ? { keluarga: cari.keluarga } : {},
  component: HalamanTambahPenduduk,
})
