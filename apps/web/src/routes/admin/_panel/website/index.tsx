import { createFileRoute } from '@tanstack/react-router'
import { HalamanArtikel } from '@/features/website/halaman'

export const Route = createFileRoute('/admin/_panel/website/')({ component: HalamanArtikel })
