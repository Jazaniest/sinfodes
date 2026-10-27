import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailSiaranDesa } from '@/features/siaran/HalamanSiaranDesa'

export const Route = createFileRoute('/admin/_panel/siaran/$siaranId')({ component: HalamanDetailSiaranDesa })
