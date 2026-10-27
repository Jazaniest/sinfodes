import { createFileRoute } from '@tanstack/react-router'
import { HalamanAgenda } from '@/features/website/halaman'

export const Route = createFileRoute('/admin/_panel/website/agenda')({ component: HalamanAgenda })
