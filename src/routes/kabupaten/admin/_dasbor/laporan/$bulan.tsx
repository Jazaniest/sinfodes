import { createFileRoute } from '@tanstack/react-router'
import { HalamanLaporanBulanan } from '@/features/kabupaten/laporan/HalamanLaporanBulanan'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/laporan/$bulan')({ component: () => <HalamanLaporanBulanan /> })
