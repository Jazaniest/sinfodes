import { createFileRoute } from '@tanstack/react-router'
import { GalatKonsol } from '@/features/konsol/GalatKonsol'
import { KerangkaKonsol } from '@/features/konsol/KerangkaKonsol'

export const Route = createFileRoute('/konsol/_konsol')({
  // Penjaga dimuat saat dibutuhkan: `beforeLoad` tidak ikut dipecah per rute, dan impor statisnya (klien serta skema
  // konsol) akan masuk JS awal website desa yang dibatasi 200 KB (SPEC §13.4).
  beforeLoad: async (ctx) => (await import('@/features/konsol/penjaga')).muatSesiKonsol(ctx),
  component: KerangkaKonsol,
  errorComponent: GalatKonsol,
})
