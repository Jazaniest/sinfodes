import { createFileRoute } from '@tanstack/react-router'
import { HalamanKatalog } from '@/features/demo/HalamanKatalog'

export const Route = createFileRoute('/katalog')({ component: HalamanKatalog })
