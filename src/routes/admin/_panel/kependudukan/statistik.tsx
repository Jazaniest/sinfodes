import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { HalamanStatistik } from '@/features/statistik/HalamanStatistik'

export const Route = createFileRoute('/admin/_panel/kependudukan/statistik')({
  // `?dusun=` berisi nomor dusun; nilai lain diabaikan.
  validateSearch: (cari: { dusun?: unknown } & SearchSchemaInput): { dusun?: number } =>
    typeof cari.dusun === 'number' && Number.isInteger(cari.dusun) && cari.dusun >= 1 ? { dusun: cari.dusun } : {},
  component: HalamanStatistik,
})
