import { createFileRoute } from '@tanstack/react-router'
import { HalamanPengumuman } from '@/features/website/halaman'

export const Route = createFileRoute('/admin/_panel/website/pengumuman')({ component: HalamanPengumuman })
