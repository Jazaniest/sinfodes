import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import type { FilterPengaduan } from '@/domain/pengaduan/schema'
import { bacaFilterPengaduan, FILTER_PENGADUAN_BAWAAN } from '@/features/pengaduan/filter-url'
import { HalamanDaftarPengaduan } from '@/features/pengaduan/HalamanDaftarPengaduan'

export const Route = createFileRoute('/admin/_panel/pengaduan/')({
  // Masukan URL boleh sebagian; parameter rusak diabaikan.
  validateSearch: (cari: Partial<FilterPengaduan> & SearchSchemaInput) => bacaFilterPengaduan(cari),
  search: { middlewares: [stripSearchParams(FILTER_PENGADUAN_BAWAAN)] },
  component: HalamanDaftarPengaduan,
})
