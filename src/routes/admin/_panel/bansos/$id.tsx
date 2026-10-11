import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterPenerima } from '@/domain/bansos/schema'
import { bacaFilterPenerima, FILTER_PENERIMA_BAWAAN } from '@/features/bansos/filter-url'
import { HalamanDetailProgram } from '@/features/bansos/HalamanDetailProgram'

export const Route = createFileRoute('/admin/_panel/bansos/$id')({
  validateSearch: (cari: Partial<FilterPenerima> & SearchSchemaInput) => bacaFilterPenerima(cari),
  search: { middlewares: [stripSearchParams(FILTER_PENERIMA_BAWAAN)] },
  component: HalamanDetailProgram,
})
