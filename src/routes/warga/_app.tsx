import { createFileRoute } from '@tanstack/react-router'
import { GalatWarga } from '@/features/warga/GalatWarga'
import { KerangkaWarga } from '@/features/warga/KerangkaWarga'
import { muatSesiWarga } from '@/features/warga/penjaga'

export const Route = createFileRoute('/warga/_app')({
  beforeLoad: muatSesiWarga,
  component: KerangkaWarga,
  errorComponent: GalatWarga,
})
