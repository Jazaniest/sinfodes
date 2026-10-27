import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { pesanGalat } from '@/api/galat'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/** Konsol gagal dibuka (mis. koneksi gagal saat memuat sesi). */
export function GalatKonsol({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <ErrorState judul="Konsol tidak dapat dibuka" pesan={pesanGalat(error)} onCobaLagi={() => void router.invalidate()} />
    </main>
  )
}
