import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import { bacaPilihanPeta, PILIHAN_PETA_BAWAAN, type PilihanPeta } from '@/features/peta/filter-url'
import { HalamanPeta } from '@/features/peta/HalamanPeta'

export const Route = createFileRoute('/admin/_panel/peta')({
  validateSearch: (cari: Partial<PilihanPeta> & SearchSchemaInput) => bacaPilihanPeta(cari),
  search: { middlewares: [stripSearchParams(PILIHAN_PETA_BAWAAN)] },
  component: HalamanPeta,
})
