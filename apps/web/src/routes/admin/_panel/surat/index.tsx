import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterPermohonan } from '@/domain/surat/permohonan'
import { bacaFilterPermohonan, FILTER_PERMOHONAN_BAWAAN } from '@/features/surat/filter-url'
import { HalamanDaftarPermohonan } from '@/features/surat/HalamanDaftarPermohonan'

export const Route = createFileRoute('/admin/_panel/surat/')({
  // Masukan URL boleh sebagian; parameter rusak diabaikan.
  validateSearch: (cari: Partial<FilterPermohonan> & SearchSchemaInput) => bacaFilterPermohonan(cari),
  search: { middlewares: [stripSearchParams(FILTER_PERMOHONAN_BAWAAN)] },
  component: HalamanDaftarPermohonan,
})
