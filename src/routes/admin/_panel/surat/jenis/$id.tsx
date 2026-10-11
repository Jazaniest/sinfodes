import { createFileRoute } from '@tanstack/react-router'
import { HalamanUbahJenis } from '@/features/surat/jenis/HalamanUbahJenis'

export const Route = createFileRoute('/admin/_panel/surat/jenis/$id')({ component: HalamanUbahJenis })
