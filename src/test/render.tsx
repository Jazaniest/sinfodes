import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { SesiAdmin } from '@/domain/pengguna/schema'
import { SesiAdminKonteks } from '@/features/admin/sesi-konteks'

/** Render layar panel admin dengan QueryClient baru (tanpa coba ulang) dan sesi admin. */
export function renderPanel(ui: ReactElement, sesi: SesiAdmin) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hasil = render(
    <QueryClientProvider client={queryClient}>
      <SesiAdminKonteks value={sesi}>{ui}</SesiAdminKonteks>
    </QueryClientProvider>,
  )
  return { ...hasil, queryClient }
}
