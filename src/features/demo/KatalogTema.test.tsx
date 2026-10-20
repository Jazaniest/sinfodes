import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GALERI_TEMA } from '@/domain/website/galeri-tema'
import { routeTree } from '@/routeTree.gen'
import { pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

function buka(alamat: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({ routeTree, context: { queryClient }, history: createMemoryHistory({ initialEntries: [alamat] }) })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Katalog tema untuk screenshot pratinjau (rencana 7E-2 Tugas 3)', () => {
  it('menampilkan Beranda Sungai Sialang dengan tema galeri yang dipilih, tanpa menyimpan apa pun', async () => {
    const { container } = buka('/katalog/tema/tenun')
    expect(await screen.findByRole('region', { name: 'Kabar terbaru' }, { timeout: 8000 })).toBeInTheDocument()
    expect(container.querySelector('header[data-bentuk="pita"] [data-pita]')).not.toBeNull()
    const akar = container.querySelector<HTMLElement>('[data-situs]')!
    expect(akar.style.getPropertyValue('--desa-huruf-judul')).toContain('Archivo')
    expect(akar.style.getPropertyValue('--desa-warna-utama')).toBe('#5A3D6E')
    expect(container.querySelector('svg[data-motif="siku-keluang"]')).not.toBeNull()
    expect(screen.getAllByText('Sungai Sialang').length).toBeGreaterThan(0)
  })
  it('setiap id galeri punya halaman katalog', async () => {
    for (const t of GALERI_TEMA.slice(0, 2)) {
      const { container, unmount } = buka(`/katalog/tema/${t.id}`)
      expect(await screen.findByRole('region', { name: 'Kabar terbaru' }, { timeout: 8000 })).toBeInTheDocument()
      expect(container.querySelector('header[data-bentuk]')).toHaveAttribute('data-bentuk', t.dasar.kepala)
      unmount()
    }
  })
  it('id tema tidak dikenal: halaman tidak ditemukan', async () => {
    buka('/katalog/tema/tidak-ada')
    expect(await screen.findByText(/tidak ditemukan/i, undefined, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Kabar terbaru' })).not.toBeInTheDocument()
  })
})
