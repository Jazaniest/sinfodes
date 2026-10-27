import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailSiaran } from '@/features/kabupaten/siaran/HalamanDetailSiaran'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/siaran/$siaranId')({ component: HalamanDetailSiaran })
