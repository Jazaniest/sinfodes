import { createFileRoute } from '@tanstack/react-router'
import { DaftarLencana } from '@/features/website/DaftarLencana'

export const Route = createFileRoute('/admin/_panel/website/lencana')({ component: DaftarLencana })
