import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import { bacaFilterPenduduk, FILTER_PENDUDUK_BAWAAN } from '@/features/penduduk/filter-url'
import { HalamanDaftarPenduduk } from '@/features/penduduk/HalamanDaftarPenduduk'

export const Route = createFileRoute('/admin/_panel/kependudukan/penduduk/')({
  // Masukan URL boleh sebagian (semua filter punya nilai bawaan); keluarannya filter lengkap.
  validateSearch: (cari: Partial<FilterPenduduk> & SearchSchemaInput) => bacaFilterPenduduk(cari),
  search: { middlewares: [stripSearchParams(FILTER_PENDUDUK_BAWAAN)] },
  component: HalamanDaftarPenduduk,
})
