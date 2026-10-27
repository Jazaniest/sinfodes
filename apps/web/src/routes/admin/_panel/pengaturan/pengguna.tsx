import { createFileRoute } from '@tanstack/react-router'
import { HalamanPengguna } from '@/features/pengaturan/HalamanPengguna'

export const Route = createFileRoute('/admin/_panel/pengaturan/pengguna')({ component: HalamanPengguna })
