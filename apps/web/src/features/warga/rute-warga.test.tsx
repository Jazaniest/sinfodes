import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { routeTree } from '@/routeTree.gen'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

function buka(alamat: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({ routeTree, context: { queryClient }, history: createMemoryHistory({ initialEntries: [alamat] }) })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('rute layanan warga (SPEC §3.5, §10)', () => {
  it('belum masuk sebagai warga → halaman masuk; sesudah masuk → Beranda di kerangka warga; sesi admin tetap (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const router = buka('/warga')
    const user = userEvent.setup()
    const nik = await screen.findByRole('textbox', { name: 'NIK' }, { timeout: 5000 })
    expect(router.state.location.pathname).toBe('/warga/masuk')
    await user.type(nik, '1405095203918002')
    await user.type(screen.getByLabelText('PIN'), '246810')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Siti Rahmah' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('Desa Sungai Sialang')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu layanan warga' })).toBeInTheDocument()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
    expect(ambilTokenSesi('warga')).toBe('warga.pdk_siti_rahmah')
  })
})
