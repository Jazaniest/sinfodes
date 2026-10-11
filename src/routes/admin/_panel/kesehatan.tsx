import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterBalita } from '@/domain/kesehatan/schema'
import { bacaFilterBalita, FILTER_BALITA_BAWAAN } from '@/features/kesehatan/filter-url'
import { HalamanKesehatan } from '@/features/kesehatan/HalamanKesehatan'

export const Route = createFileRoute('/admin/_panel/kesehatan')({
  validateSearch: (cari: Partial<FilterBalita> & SearchSchemaInput) => bacaFilterBalita(cari),
  search: { middlewares: [stripSearchParams(FILTER_BALITA_BAWAAN)] },
  component: HalamanKesehatan,
})
