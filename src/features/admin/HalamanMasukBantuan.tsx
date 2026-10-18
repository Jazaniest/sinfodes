import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { tukarTiketBantuan } from '@/api/sesi'
import { keAlamat } from '@/app/alamat'
import { simpanSesi } from '@/app/sesi'
import logoMark from '@/assets/brand/sinfodes-mark.svg'

const PESAN_TIKET = 'Tiket bantuan tidak berlaku. Minta ulang dari Konsol.'

/**
 * `/admin/bantuan?tiket=…` di alamat desa (SPEC-V0.2 §5.3): tukar tiket sekali pakai dari Konsol menjadi sesi panel lihat saja,
 * lalu buka beranda panel.
 */
export function HalamanMasukBantuan({ tiket }: { tiket: string | undefined }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [galat, setGalat] = useState<string | null>(tiket ? null : PESAN_TIKET)
  // Tiket hanya sekali pakai: efek ganda (StrictMode) tidak boleh menukarnya dua kali.
  const sudahDitukar = useRef(false)
  useEffect(() => {
    if (!tiket || sudahDitukar.current) return
    sudahDitukar.current = true
    tukarTiketBantuan(tiket)
      .then(({ token }) => {
        simpanSesi(token)
        queryClient.clear()
        void router.navigate({ to: '/admin', replace: true })
      })
      .catch((e: unknown) => setGalat(e instanceof GalatApi && e.kode === 'UNAUTHENTICATED' ? PESAN_TIKET : pesanGalat(e)))
  }, [tiket, queryClient, router])

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <img src={logoMark} alt="Sinfodes" className="h-9 w-auto" />
      <h1 className="mt-4 font-serif text-judul-halaman font-medium">Mode bantuan Sinfodes</h1>
      {galat ? (
        <>
          <p role="alert" className="mt-2">
            {galat}
          </p>
          <a href={keAlamat({ jenis: 'konsol' })} className="mt-4 inline-block text-biru underline underline-offset-4">
            Kembali ke Konsol
          </a>
        </>
      ) : (
        <p aria-live="polite" className="mt-2 text-tinta-2">
          Membuka panel desa, lihat saja…
        </p>
      )}
    </main>
  )
}

const rute = getRouteApi('/admin/bantuan')

/** Pembungkus rute: tiket dari alamat. */
export function HalamanMasukBantuanRute() {
  const { tiket } = rute.useSearch()
  return <HalamanMasukBantuan tiket={tiket} />
}
