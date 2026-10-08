import { Link, Outlet } from '@tanstack/react-router'
import { DemoToolbar } from '@/features/demo/DemoToolbar'
import { PenampungToast } from '@/ui/toast/PenampungToast'

export function KerangkaAkar() {
  return (
    <>
      <Outlet />
      {import.meta.env.VITE_DEMO === 'true' && <DemoToolbar />}
      <PenampungToast />
    </>
  )
}

export function HalamanTidakDitemukan() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-label font-medium text-tinta-2 uppercase">Galat 404</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-tinta-2">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <Link to="/" className="mt-4 inline-block text-biru underline underline-offset-4">
        Kembali ke halaman demo
      </Link>
    </main>
  )
}
