import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { pesanGalat } from '@/api/galat'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/** Layanan warga gagal dibuka, mis. koneksi gagal saat memuat sesi. */
export function GalatWarga({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="skala-warga mx-auto max-w-lg px-4 py-12">
      <ErrorState judul="Layanan warga tidak dapat dibuka" pesan={pesanGalat(error)} onCobaLagi={() => void router.invalidate()} />
    </main>
  )
}
