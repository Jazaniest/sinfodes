import { createFileRoute } from '@tanstack/react-router'
import { HalamanIdentitas } from '@/features/pengaturan/HalamanIdentitas'

export const Route = createFileRoute('/admin/_panel/pengaturan/')({ component: HalamanIdentitas })
