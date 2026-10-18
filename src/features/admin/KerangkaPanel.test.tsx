import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilTiketBantuan } from '@/api/konsol'
import { beriAksesSinfodes } from '@/api/pengaturan'
import { tukarTiketBantuan } from '@/api/sesi'
import { ambilDb } from '@/mocks/db'
import { routeTree } from '@/routeTree.gen'
import { AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

function bukaPanel(alamat: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({ routeTree, context: { queryClient }, history: createMemoryHistory({ initialEntries: [alamat] }) })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Kerangka panel', () => {
  it('nama desa di sidebar ikut berubah setelah Identitas disimpan, tanpa pindah halaman (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    bukaPanel('/admin/pengaturan')
    const user = userEvent.setup()
    const nama = await screen.findByRole('textbox', { name: /Nama desa/ }, { timeout: 5000 })
    await user.clear(nama)
    await user.type(nama, 'Sungai Sialang Baru')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(ambilDb().desa.find((d) => d.id === 'desa_sungai_sialang')?.nama).toBe('Sungai Sialang Baru'))
    expect((await screen.findAllByText('Desa Sungai Sialang Baru', {}, { timeout: 3000 })).length).toBeGreaterThan(0)
  })
})

describe('Kerangka panel › mode bantuan (SPEC-V0.2 §5.3)', () => {
  it('sesi bantuan menampilkan pita lihat saja dengan jam berakhirnya', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const { tiket } = await ambilTiketBantuan('desa_sungai_sialang')
    const { token } = await tukarTiketBantuan(tiket)
    aturTokenSesi(token)
    bukaPanel('/admin')
    expect(await screen.findByText('Mode bantuan Sinfodes · lihat saja · berakhir 11.00', {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
