import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterSuratKeluar } from '@/domain/surat/arsip'
import { bacaFilterSuratKeluar, FILTER_SURAT_KELUAR_BAWAAN } from '@/features/surat/arsip/filter-url'
import { HalamanSuratKeluar } from '@/features/surat/arsip/HalamanSuratKeluar'

export const Route = createFileRoute('/admin/_panel/surat/arsip/')({
  // Masukan URL boleh sebagian; parameter rusak diabaikan.
  validateSearch: (cari: Partial<FilterSuratKeluar> & SearchSchemaInput) => bacaFilterSuratKeluar(cari),
  search: { middlewares: [stripSearchParams(FILTER_SURAT_KELUAR_BAWAAN)] },
  component: HalamanSuratKeluar,
})
