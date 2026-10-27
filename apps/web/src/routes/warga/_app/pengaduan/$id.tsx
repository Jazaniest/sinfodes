import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailPengaduan } from '@/features/warga/pengaduan/HalamanDetailPengaduan'

export const Route = createFileRoute('/warga/_app/pengaduan/$id')({ component: HalamanDetailPengaduan })
