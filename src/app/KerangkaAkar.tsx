import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { RouterProvider } from 'react-aria-components'
import { DemoToolbar } from '@/features/demo/DemoToolbar'
import { PilihPeranPanel } from '@/features/demo/PilihPeranPanel'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { keAlamat, konteksSekarang } from './alamat'
import { hrefPublik } from './rewrite-alamat'

/**
 * Akar aplikasi. Link/Menu React Aria di ui/ menavigasi lewat TanStack Router tanpa memuat ulang halaman; atribut `href`-nya
 * memakai alamat luar, supaya tautan yang dibuka di tab baru atau disalin tetap benar di alamat subdomain (SPEC-V0.2 §4.5).
 */
export function KerangkaAkar() {
  const router = useRouter()
  const jalur = useRouterState({ select: (s) => s.location.pathname })
  const diPanel = jalur.startsWith('/admin') && !jalur.startsWith('/admin/masuk')
  return (
    <RouterProvider navigate={(href) => void router.navigate({ href })} useHref={(href) => hrefPublik(konteksSekarang(), href)}>
      <Outlet />
      {import.meta.env.VITE_DEMO === 'true' && <DemoToolbar sisipan={diPanel ? <PilihPeranPanel /> : null} />}
      <PenampungToast />
    </RouterProvider>
  )
}

export function HalamanTidakDitemukan() {
  // Di alamat desa, "/" adalah beranda desa; di alamat lain, kembali ke halaman utama Sinfodes.
  const keBeranda = konteksSekarang().jenis === 'desa' ? '/' : keAlamat({ jenis: 'induk' })
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-label font-medium text-tinta-2 uppercase">Galat 404</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-tinta-2">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <a href={keBeranda} className="mt-4 inline-block text-biru underline underline-offset-4">
        Kembali ke beranda
      </a>
    </main>
  )
}
