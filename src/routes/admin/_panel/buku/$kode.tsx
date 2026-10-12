import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import { bacaHalamanBuku, HALAMAN_BUKU_BAWAAN, type HalamanBukuUrl } from '@/features/buku/filter-url'
import { HalamanIsiBuku } from '@/features/buku/HalamanIsiBuku'

export const Route = createFileRoute('/admin/_panel/buku/$kode')({
  validateSearch: (cari: Partial<HalamanBukuUrl> & SearchSchemaInput) => bacaHalamanBuku(cari),
  search: { middlewares: [stripSearchParams(HALAMAN_BUKU_BAWAAN)] },
  component: HalamanIsiBuku,
})
