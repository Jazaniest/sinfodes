import { createFileRoute } from '@tanstack/react-router'
import { HalamanTampilan } from '@/features/website/halaman'

export const Route = createFileRoute('/admin/_panel/website/tampilan')({ component: HalamanTampilan })
