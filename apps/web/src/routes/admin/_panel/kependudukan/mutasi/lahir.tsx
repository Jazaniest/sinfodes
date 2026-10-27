import { createFileRoute } from '@tanstack/react-router'
import { bacaLaporanAwal } from '@/features/mutasi/bersama'
import { HalamanCatatLahir } from '@/features/mutasi/HalamanCatatLahir'

export const Route = createFileRoute('/admin/_panel/kependudukan/mutasi/lahir')({
  validateSearch: bacaLaporanAwal,
  component: HalamanCatatLahir,
})
