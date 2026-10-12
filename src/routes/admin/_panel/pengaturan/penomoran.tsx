import { createFileRoute } from '@tanstack/react-router'
import { HalamanPenomoran } from '@/features/pengaturan/HalamanPenomoran'

export const Route = createFileRoute('/admin/_panel/pengaturan/penomoran')({ component: HalamanPenomoran })
