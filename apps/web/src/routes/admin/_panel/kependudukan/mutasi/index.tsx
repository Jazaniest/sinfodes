import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterMutasi } from '@/domain/mutasi/buku'
import { bacaFilterMutasi, FILTER_MUTASI_BAWAAN } from '@/features/mutasi/filter-url'
import { HalamanDaftarMutasi } from '@/features/mutasi/HalamanDaftarMutasi'

export const Route = createFileRoute('/admin/_panel/kependudukan/mutasi/')({
  // Masukan URL boleh sebagian; parameter rusak diabaikan (fokus review 3 dari 2A-1).
  validateSearch: (cari: Partial<FilterMutasi> & SearchSchemaInput) => bacaFilterMutasi(cari),
  search: { middlewares: [stripSearchParams(FILTER_MUTASI_BAWAAN)] },
  component: HalamanDaftarMutasi,
})
