import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { ambilTokenSesi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { kunciWarga, opsiSesiWarga } from '@/api/warga'
import { hapusSesi } from '@/app/sesi'
import type { SesiWarga } from '@/domain/warga/sesi'

type Konteks = { context: { queryClient: QueryClient }; location: { href: string } }

/**
 * Penjaga layanan warga (SPEC §3.5): belum masuk atau sesi habis → halaman masuk warga, lalu kembali ke alamat asal.
 * Hanya sesi warga yang dihapus; sesi panel admin di peramban yang sama tetap (fokus review 1).
 */
export async function muatSesiWarga({ context, location }: Konteks): Promise<{ sesiWarga: SesiWarga }> {
  const keMasuk = () => redirect({ to: '/warga/masuk', search: { ke: location.href } })
  if (!ambilTokenSesi('warga')) throw keMasuk()
  try {
    return { sesiWarga: await context.queryClient.ensureQueryData(opsiSesiWarga()) }
  } catch (e) {
    if (e instanceof GalatApi && e.kode === 'UNAUTHENTICATED') {
      hapusSesi('warga')
      context.queryClient.removeQueries({ queryKey: kunciWarga.semua })
      throw keMasuk()
    }
    throw e
  }
}
