import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailKeluarga } from '@/features/keluarga/HalamanDetailKeluarga'

export const Route = createFileRoute('/admin/_panel/kependudukan/keluarga/$id')({ component: HalamanDetailKeluarga })
