import { createFileRoute } from '@tanstack/react-router'
import { bacaPendudukAwal } from '@/features/mutasi/bersama'
import { HalamanCatatMeninggal } from '@/features/mutasi/HalamanCatatMeninggal'

export const Route = createFileRoute('/admin/_panel/kependudukan/mutasi/meninggal')({
  validateSearch: bacaPendudukAwal,
  component: HalamanCatatMeninggal,
})
