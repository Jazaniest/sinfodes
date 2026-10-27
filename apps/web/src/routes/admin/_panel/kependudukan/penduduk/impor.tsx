import { createFileRoute } from '@tanstack/react-router'
import { HalamanImpor } from '@/features/impor/HalamanImpor'

export const Route = createFileRoute('/admin/_panel/kependudukan/penduduk/impor')({ component: HalamanImpor })
