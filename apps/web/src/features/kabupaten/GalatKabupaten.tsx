import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { pesanGalat } from '@/api/galat'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/** Dasbor kabupaten gagal dibuka (mis. koneksi gagal saat memuat sesi). */
export function GalatKabupaten({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <ErrorState judul="Dasbor kabupaten tidak dapat dibuka" pesan={pesanGalat(error)} onCobaLagi={() => void router.invalidate()} />
    </main>
  )
}
