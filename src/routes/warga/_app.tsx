import { createFileRoute } from '@tanstack/react-router'
import { GalatWarga } from '@/features/warga/GalatWarga'
import { KerangkaWarga } from '@/features/warga/KerangkaWarga'

export const Route = createFileRoute('/warga/_app')({
  // Penjaga dimuat saat dibutuhkan, seperti penjaga Konsol: `beforeLoad` tidak ikut dipecah per rute, dan impor statisnya
  // (klien dan skema layanan warga) akan masuk JS awal website desa yang dibatasi 200 KB (SPEC §13.4).
  beforeLoad: async (ctx) => (await import('@/features/warga/penjaga')).muatSesiWarga(ctx),
  component: KerangkaWarga,
  errorComponent: GalatWarga,
})
