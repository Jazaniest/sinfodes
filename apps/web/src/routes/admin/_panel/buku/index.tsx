import { createFileRoute } from '@tanstack/react-router'
import { HalamanDaftarBuku } from '@/features/buku/HalamanDaftarBuku'

export const Route = createFileRoute('/admin/_panel/buku/')({ component: HalamanDaftarBuku })
