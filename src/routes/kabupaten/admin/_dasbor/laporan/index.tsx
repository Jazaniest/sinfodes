import { createFileRoute } from '@tanstack/react-router'
import { DaftarLaporan } from '@/features/kabupaten/laporan/DaftarLaporan'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/laporan/')({ component: () => <DaftarLaporan /> })
