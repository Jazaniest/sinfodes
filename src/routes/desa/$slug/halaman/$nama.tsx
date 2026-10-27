import { createFileRoute } from '@tanstack/react-router'
import { RuteHalamanTambahan } from '@/features/publik/halaman/HalamanTambahan'

export const Route = createFileRoute('/desa/$slug/halaman/$nama')({ component: RuteHalamanTambahan })
