import { createFileRoute } from '@tanstack/react-router'
import { GalatKabupaten } from '@/features/kabupaten/GalatKabupaten'
import { KerangkaKabupaten } from '@/features/kabupaten/KerangkaKabupaten'

export const Route = createFileRoute('/kabupaten/admin/_dasbor')({
  // Penjaga dimuat saat dibutuhkan supaya klien dan skema kabupaten tidak masuk JS awal website desa (SPEC §13.4).
  beforeLoad: async (ctx) => (await import('@/features/kabupaten/penjaga')).muatSesiKabupaten(ctx),
  component: KerangkaKabupaten,
  errorComponent: GalatKabupaten,
})
