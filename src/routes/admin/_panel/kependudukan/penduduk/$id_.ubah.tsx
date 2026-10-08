import { createFileRoute } from '@tanstack/react-router'
import { HalamanUbahPenduduk } from '@/features/penduduk/HalamanUbahPenduduk'

export const Route = createFileRoute('/admin/_panel/kependudukan/penduduk/$id_/ubah')({ component: HalamanUbahPenduduk })
