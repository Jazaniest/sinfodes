import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterDesaKonsol } from '@/domain/konsol/filter'
import { bacaFilterDesa, FILTER_DESA_BAWAAN } from '@/features/konsol/desa/filter-url'
import { HalamanDaftarDesa } from '@/features/konsol/desa/HalamanDaftarDesa'

export const Route = createFileRoute('/konsol/_konsol/desa/')({
  validateSearch: (cari: Partial<FilterDesaKonsol> & SearchSchemaInput) => bacaFilterDesa(cari),
  search: { middlewares: [stripSearchParams(FILTER_DESA_BAWAAN)] },
  component: HalamanDaftarDesa,
})
