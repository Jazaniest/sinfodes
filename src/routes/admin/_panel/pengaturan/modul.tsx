import { createFileRoute } from '@tanstack/react-router'
import { HalamanModul } from '@/features/pengaturan/HalamanModul'

export const Route = createFileRoute('/admin/_panel/pengaturan/modul')({ component: HalamanModul })
