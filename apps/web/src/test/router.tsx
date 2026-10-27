import { act, render } from '@testing-library/react'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { parseSearch, stringifySearch } from '@/app/cari-url'

/** Render satu layar di router memori: rute `/` berisi `ui`, rute `/lain` berisi teks "Halaman lain". Khusus uji. */
export async function renderDenganRouter(ui: ReactElement) {
  const akar = createRootRoute({ component: Outlet })
  const halaman = createRoute({ getParentRoute: () => akar, path: '/', component: () => ui })
  const lain = createRoute({ getParentRoute: () => akar, path: '/lain', component: () => <p>Halaman lain</p> })
  const router = createRouter({
    routeTree: akar.addChildren([halaman, lain]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    parseSearch,
    stringifySearch,
  })
  const hasil = render(<RouterProvider router={router} />)
  await act(() => router.load())
  return { ...hasil, router }
}
