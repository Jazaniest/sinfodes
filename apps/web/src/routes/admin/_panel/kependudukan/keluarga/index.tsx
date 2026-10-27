import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterKeluarga } from '@/domain/keluarga/schema'
import { bacaFilterKeluarga, FILTER_KELUARGA_BAWAAN } from '@/features/keluarga/filter-url'
import { HalamanDaftarKeluarga } from '@/features/keluarga/HalamanDaftarKeluarga'

export const Route = createFileRoute('/admin/_panel/kependudukan/keluarga/')({
  // Masukan URL boleh sebagian (semua filter punya nilai bawaan); keluarannya filter lengkap.
  validateSearch: (cari: Partial<FilterKeluarga> & SearchSchemaInput) => bacaFilterKeluarga(cari),
  search: { middlewares: [stripSearchParams(FILTER_KELUARGA_BAWAAN)] },
  component: HalamanDaftarKeluarga,
})
