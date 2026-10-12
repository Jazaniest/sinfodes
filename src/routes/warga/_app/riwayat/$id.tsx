import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailRiwayat } from '@/features/warga/HalamanDetailRiwayat'

export const Route = createFileRoute('/warga/_app/riwayat/$id')({ component: HalamanDetailRiwayat })
