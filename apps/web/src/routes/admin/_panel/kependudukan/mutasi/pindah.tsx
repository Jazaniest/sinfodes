import { createFileRoute } from '@tanstack/react-router'
import { bacaPendudukAwal } from '@/features/mutasi/bersama'
import { HalamanCatatPindah } from '@/features/mutasi/HalamanCatatPindah'

export const Route = createFileRoute('/admin/_panel/kependudukan/mutasi/pindah')({
  validateSearch: bacaPendudukAwal,
  component: HalamanCatatPindah,
})
