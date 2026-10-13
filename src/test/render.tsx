import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { SesiAdmin } from '@/domain/pengguna/schema'
import type { IdentitasPublik } from '@/domain/publik/schema'
import type { SesiWarga } from '@/domain/warga/sesi'
import { SesiAdminKonteks } from '@/features/admin/sesi-konteks'
import { PublikKonteks } from '@/features/publik/publik-konteks'
import { SesiWargaKonteks } from '@/features/warga/sesi-konteks'
import { contohIdentitasPublik } from './publik'
import { contohSesiWarga } from './sesi'

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

/** Render layar layanan warga dengan QueryClient baru (tanpa coba ulang) dan sesi warga. */
export function renderWarga(ui: ReactElement, sesi: SesiWarga = contohSesiWarga()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hasil = render(
    <QueryClientProvider client={queryClient}>
      <SesiWargaKonteks value={sesi}>{ui}</SesiWargaKonteks>
    </QueryClientProvider>,
  )
  return { ...hasil, queryClient }
}

/** Render halaman website desa dengan QueryClient baru (tanpa coba ulang) dan identitas desa. */
export function renderPublik(ui: ReactElement, identitas: IdentitasPublik = contohIdentitasPublik()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hasil = render(
    <QueryClientProvider client={queryClient}>
      <PublikKonteks value={identitas}>{ui}</PublikKonteks>
    </QueryClientProvider>,
  )
  return { ...hasil, queryClient }
}
