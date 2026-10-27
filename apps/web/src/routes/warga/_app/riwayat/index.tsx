import { createFileRoute } from '@tanstack/react-router'
import { DaftarRiwayat } from '@/features/warga/DaftarRiwayat'

export const Route = createFileRoute('/warga/_app/riwayat/')({ component: DaftarRiwayat })
