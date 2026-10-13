import { createFileRoute } from '@tanstack/react-router'
import { TransparansiPublik } from '@/features/publik/transparansi/TransparansiPublik'

export const Route = createFileRoute('/desa/$slug/transparansi')({ component: TransparansiPublik })
