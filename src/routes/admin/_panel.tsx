import { createFileRoute } from '@tanstack/react-router'
import { GalatPanel } from '@/features/admin/GalatPanel'
import { KerangkaPanel } from '@/features/admin/KerangkaPanel'
import { muatSesiPanel } from '@/features/admin/penjaga'

export const Route = createFileRoute('/admin/_panel')({
  beforeLoad: muatSesiPanel,
  component: KerangkaPanel,
  errorComponent: GalatPanel,
})
