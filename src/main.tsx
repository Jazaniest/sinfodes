import '@/ui/styles/fonts'
import '@/ui/styles/register.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { buatQueryClient } from '@/app/query-client'
import { pulihkanSesi } from '@/app/sesi'
import { routeTree } from './routeTree.gen'

const queryClient = buatQueryClient()
const router = createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

async function mulai() {
  if (import.meta.env.VITE_DEMO === 'true') {
    const { mulaiMock } = await import('@/mocks/browser')
    await mulaiMock()
  }
  pulihkanSesi()
  const akar = document.getElementById('root')
  if (!akar) throw new Error('Elemen #root tidak ditemukan')
  createRoot(akar).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void mulai()
