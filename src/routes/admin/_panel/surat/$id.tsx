import { createFileRoute } from '@tanstack/react-router'
import { HalamanRuangKerja } from '@/features/surat/HalamanRuangKerja'

export const Route = createFileRoute('/admin/_panel/surat/$id')({ component: HalamanRuangKerja })
