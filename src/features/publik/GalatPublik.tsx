import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { GalatApi, pesanGalat } from '@/api/galat'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'

/** Website desa gagal dibuka: alamat salah atau desa belum aktif (fokus review 4), atau koneksi gagal. */
export function GalatPublik({ error }: ErrorComponentProps) {
  const router = useRouter()
  if (error instanceof GalatApi && error.kode === 'NOT_FOUND') {
    return (
      <main className="skala-publik mx-auto max-w-xl px-4 py-16">
        <p className="text-label font-medium text-tinta-2 uppercase">Galat 404</p>
        <h1 className="mt-1 font-serif text-judul-halaman font-medium">Website desa tidak ditemukan</h1>
        <p className="mt-2 text-tinta-2">Alamatnya mungkin salah, atau website desa ini belum dibuka untuk umum.</p>
      </main>
    )
  }
  return (
    <main className="skala-publik mx-auto max-w-xl px-4 py-12">
      <ErrorState judul="Website desa belum bisa dibuka" pesan={pesanGalat(error)} onCobaLagi={() => void router.invalidate()} />
    </main>
  )
}
