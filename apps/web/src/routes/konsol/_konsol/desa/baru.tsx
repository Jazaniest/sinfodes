import { createFileRoute } from '@tanstack/react-router'
import { HalamanTambahDesa } from '@/features/konsol/desa/HalamanTambahDesa'

export const Route = createFileRoute('/konsol/_konsol/desa/baru')({ component: HalamanTambahDesa })
