import { createFileRoute } from '@tanstack/react-router'
import { HalamanSiaranDesa } from '@/features/siaran/HalamanSiaranDesa'

export const Route = createFileRoute('/admin/_panel/siaran/')({ component: HalamanSiaranDesa })
