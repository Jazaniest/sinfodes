import { createFileRoute } from '@tanstack/react-router'
import { DaftarSiaran } from '@/features/kabupaten/siaran/DaftarSiaran'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/siaran/')({ component: DaftarSiaran })
