import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { pesanGalat } from '@/api/galat'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/** Panel gagal dibuka (mis. koneksi gagal saat memuat sesi). */
export function GalatPanel({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <ErrorState judul="Panel admin tidak dapat dibuka" pesan={pesanGalat(error)} onCobaLagi={() => void router.invalidate()} />
    </main>
  )
}
