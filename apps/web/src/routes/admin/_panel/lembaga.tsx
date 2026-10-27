import { createFileRoute } from '@tanstack/react-router'
import { HalamanLembaga } from '@/features/lembaga/HalamanLembaga'

export const Route = createFileRoute('/admin/_panel/lembaga')({ component: HalamanLembaga })
