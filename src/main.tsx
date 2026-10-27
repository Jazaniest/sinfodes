import '@/ui/styles/fonts'
import '@/ui/styles/register.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ambilAlamat } from '@/api/alamat'
import { keAlamat, konteksSekarang } from '@/app/alamat'
import { alihAlamatLama } from '@/app/alamat-lama'
import { buatQueryClient } from '@/app/query-client'
import { buatRouter } from '@/app/router'
import { pulihkanSesi } from '@/app/sesi'
import { tampilkanToast } from '@/ui/toast/antrean'

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof buatRouter>
  }
}

const jalurSekarang = () => `${window.location.pathname}${window.location.search}${window.location.hash}`

/** Urutan mulai (SPEC-V0.2 §4): pengalihan alamat dulu, lalu data demo, lalu alias desa, baru router dan tampilan. */
async function mulai() {
  const konteks = konteksSekarang()
  if (konteks.jenis === 'alihkan-induk') {
    window.location.replace(keAlamat({ jenis: 'induk' }, jalurSekarang()))
    return
  }
  if (konteks.jenis === 'induk') {
    const lama = alihAlamatLama(window.location)
    if (lama) {
      window.location.replace(keAlamat(lama.tujuan, lama.jalur))
      return
    }
  }
  const queryClient = buatQueryClient()
  if (import.meta.env.VITE_DEMO === 'true') {
    const { mulaiMock } = await import('@/mocks/browser')
    await mulaiMock({ saatBerubah: () => void queryClient.invalidateQueries() })
    // Masuk cepat dari halaman demo (`?demo=<kunci akun>`); parameternya dihapus dari URL sebelum router membaca.
    const { ambilKunciMasukCepat, terapkanMasukCepat } = await import('@/features/demo/masuk-cepat')
    const { kunci, sisa } = ambilKunciMasukCepat(window.location.search)
    if (kunci) {
      window.history.replaceState(null, '', `${window.location.pathname}${sisa}${window.location.hash}`)
      if (!(await terapkanMasukCepat(konteks, window.location.pathname, kunci))) {
        tampilkanToast({ pesan: 'Akun demo tidak bisa dipakai di alamat ini. Silakan masuk manual.', nada: 'galat' })
      }
    }
  }
  if (konteks.jenis === 'desa') {
    try {
      const hasil = await ambilAlamat()
      if (hasil.jenis === 'alias') {
        window.location.replace(keAlamat({ jenis: 'desa', label: hasil.labelBaru }, jalurSekarang()))
        return
      }
    } catch {
      // Desa tidak dikenal: halaman desa sendiri yang menampilkan "tidak ditemukan".
    }
  }
  pulihkanSesi()
  const router = buatRouter(queryClient, konteks)
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
