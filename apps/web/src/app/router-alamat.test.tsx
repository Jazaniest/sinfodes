import { act, render, screen } from '@testing-library/react'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { expect, it } from 'vitest'
import { rewriteAlamat } from './rewrite-alamat'

function KabarUji() {
  const { slug } = kabar.useParams()
  return <p>Kabar {slug}</p>
}

const akar = createRootRoute({ component: Outlet })
const kabar = createRoute({ getParentRoute: () => akar, path: '/desa/$slug/kabar', component: KabarUji })
const panel = createRoute({ getParentRoute: () => akar, path: '/admin', component: () => <p>Panel</p> })

it('alamat desa: /kabar dibaca sebagai /desa/<label>/kabar dan dikeluarkan kembali tanpa awalan (SPEC-V0.2 §4.5)', async () => {
  const router = createRouter({
    routeTree: akar.addChildren([kabar, panel]),
    history: createMemoryHistory({ initialEntries: ['/kabar'] }),
    rewrite: rewriteAlamat({ jenis: 'desa', label: 'sungaisialang' }),
  })
  render(<RouterProvider router={router} />)
  await act(() => router.load())
  expect(await screen.findByText('Kabar sungaisialang')).toBeInTheDocument()

  await act(() => router.navigate({ to: '/admin' }))
  expect(screen.getByText('Panel')).toBeInTheDocument()
  expect(router.history.location.pathname).toBe('/admin')

  await act(() => router.navigate({ to: '/desa/$slug/kabar', params: { slug: 'sungaisialang' } }))
  expect(router.history.location.pathname).toBe('/kabar')
})
