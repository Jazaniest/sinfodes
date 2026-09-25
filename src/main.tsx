import '@/ui/styles/fonts'
import '@/ui/styles/register.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const akar = document.getElementById('root')
if (!akar) throw new Error('Elemen #root tidak ditemukan')
createRoot(akar).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
