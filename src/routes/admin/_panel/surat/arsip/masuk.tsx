import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterSuratMasuk } from '@/domain/surat/arsip'
import { bacaFilterSuratMasuk, FILTER_SURAT_MASUK_BAWAAN } from '@/features/surat/arsip/filter-url'
import { HalamanSuratMasuk } from '@/features/surat/arsip/HalamanSuratMasuk'

export const Route = createFileRoute('/admin/_panel/surat/arsip/masuk')({
  validateSearch: (cari: Partial<FilterSuratMasuk> & SearchSchemaInput) => bacaFilterSuratMasuk(cari),
  search: { middlewares: [stripSearchParams(FILTER_SURAT_MASUK_BAWAAN)] },
  component: HalamanSuratMasuk,
})
