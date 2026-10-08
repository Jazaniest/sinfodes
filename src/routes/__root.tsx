import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import { HalamanTidakDitemukan, KerangkaAkar } from '@/app/KerangkaAkar'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: KerangkaAkar,
  notFoundComponent: HalamanTidakDitemukan,
})
