import { createFileRoute } from '@tanstack/react-router'
import { HalamanProfilPenduduk } from '@/features/penduduk/HalamanProfilPenduduk'

export const Route = createFileRoute('/admin/_panel/kependudukan/penduduk/$id')({ component: HalamanProfilPenduduk })
