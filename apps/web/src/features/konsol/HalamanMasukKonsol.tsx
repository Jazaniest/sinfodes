import { getRouteApi, useRouter } from '@tanstack/react-router'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { Tautan } from '@/ui/navigasi/Tautan'
import { FormMasukKonsol } from './FormMasukKonsol'

const rute = getRouteApi('/konsol/masuk')

/** Halaman masuk Konsol (SPEC §3.5). Sesudah masuk, kembali ke alamat asal (`?ke=`) atau ke Ringkasan. */
export function HalamanMasukKonsol() {
  const { ke } = rute.useSearch()
  const router = useRouter()
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <img src={logoMark} alt="" className="h-10 w-auto" />
        <div>
          <p className="text-label font-medium text-tinta-2 uppercase">Sinfodes</p>
          <h1 className="font-serif text-judul-halaman font-medium">Masuk Konsol</h1>
        </div>
      </div>
      <FormMasukKonsol onBerhasil={() => void router.navigate({ href: ke ?? '/konsol' })} />
      <p className="text-teks-kecil text-tinta-2">
        Di demo, akun konsol juga bisa dipilih dari <Tautan href="/">halaman demo</Tautan>.
      </p>
    </main>
  )
}
