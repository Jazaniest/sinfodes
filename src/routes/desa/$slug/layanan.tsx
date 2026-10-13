import { createFileRoute } from '@tanstack/react-router'
import { LayananPublik } from '@/features/publik/layanan/LayananPublik'

export const Route = createFileRoute('/desa/$slug/layanan')({ component: LayananPublik })
