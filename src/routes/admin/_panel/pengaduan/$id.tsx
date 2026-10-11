import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailPengaduan } from '@/features/pengaduan/HalamanDetailPengaduan'

export const Route = createFileRoute('/admin/_panel/pengaduan/$id')({ component: HalamanDetailPengaduan })
