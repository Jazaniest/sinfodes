import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { HalamanStatistik } from '@/features/statistik/HalamanStatistik'

export const Route = createFileRoute('/admin/_panel/kependudukan/statistik')({
  // `?dusun=` berisi nomor dusun: teks dari URL (tahap 6D) atau angka dari tautan di aplikasi; nilai lain diabaikan.
  validateSearch: (cari: { dusun?: unknown } & SearchSchemaInput): { dusun?: number } => {
    const dusun = typeof cari.dusun === 'string' && /^\d+$/.test(cari.dusun) ? Number(cari.dusun) : cari.dusun
    return typeof dusun === 'number' && Number.isInteger(dusun) && dusun >= 1 ? { dusun } : {}
  },
  component: HalamanStatistik,
})
