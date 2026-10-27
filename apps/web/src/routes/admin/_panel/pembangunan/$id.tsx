import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailKegiatan } from '@/features/pembangunan/HalamanDetailKegiatan'

export const Route = createFileRoute('/admin/_panel/pembangunan/$id')({ component: HalamanDetailKegiatan })
