import { createFileRoute } from '@tanstack/react-router'
import { DaftarPengaduan } from '@/features/warga/pengaduan/DaftarPengaduan'

export const Route = createFileRoute('/warga/_app/pengaduan/')({ component: DaftarPengaduan })
