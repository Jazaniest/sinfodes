import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterAset } from '@/domain/aset/schema'
import { bacaFilterAset, FILTER_ASET_BAWAAN } from '@/features/aset/filter-url'
import { HalamanAset } from '@/features/aset/HalamanAset'

export const Route = createFileRoute('/admin/_panel/aset')({
  validateSearch: (cari: Partial<FilterAset> & SearchSchemaInput) => bacaFilterAset(cari),
  search: { middlewares: [stripSearchParams(FILTER_ASET_BAWAAN)] },
  component: HalamanAset,
})
