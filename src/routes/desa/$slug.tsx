import { createFileRoute } from '@tanstack/react-router'
import { opsiIdentitasPublik } from '@/api/publik'
import { GalatPublik } from '@/features/publik/GalatPublik'
import { KerangkaPublik } from '@/features/publik/KerangkaPublik'

export const Route = createFileRoute('/desa/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(opsiIdentitasPublik(params.slug)),
  component: KerangkaPublik,
  errorComponent: GalatPublik,
})
