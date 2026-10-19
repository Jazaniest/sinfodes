import { createFileRoute } from '@tanstack/react-router'
import { HalamanTulisSiaran } from '@/features/kabupaten/siaran/HalamanTulisSiaran'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/siaran/tulis')({ component: HalamanTulisSiaran })
