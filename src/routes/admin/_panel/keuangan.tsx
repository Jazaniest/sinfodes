import { createFileRoute } from '@tanstack/react-router'
import { HalamanKeuangan } from '@/features/keuangan/HalamanKeuangan'

export const Route = createFileRoute('/admin/_panel/keuangan')({ component: HalamanKeuangan })
