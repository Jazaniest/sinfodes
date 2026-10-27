import { createFileRoute } from '@tanstack/react-router'
import { HalamanPrivasi } from '@/features/induk/HalamanPrivasi'

export const Route = createFileRoute('/privasi')({ component: HalamanPrivasi })
