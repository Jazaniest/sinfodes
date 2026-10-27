import { createFileRoute } from '@tanstack/react-router'
import { HalamanWilayah } from '@/features/pengaturan/HalamanWilayah'

export const Route = createFileRoute('/admin/_panel/pengaturan/wilayah')({ component: HalamanWilayah })
