import { createFileRoute } from '@tanstack/react-router'
import { PotensiPublik } from '@/features/publik/potensi/PotensiPublik'

export const Route = createFileRoute('/desa/$slug/potensi')({ component: PotensiPublik })
