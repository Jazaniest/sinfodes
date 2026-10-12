import { createFileRoute } from '@tanstack/react-router'
import { HalamanDaftarKegiatan } from '@/features/pembangunan/HalamanDaftarKegiatan'

export const Route = createFileRoute('/admin/_panel/pembangunan/')({ component: HalamanDaftarKegiatan })
