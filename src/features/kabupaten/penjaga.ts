import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { ambilTokenSesi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { kunciKabupaten, opsiSesiKabupaten } from '@/api/kabupaten'
import { hapusSesi } from '@/app/sesi'
import type { SesiKabupaten } from '@/domain/kabupaten/schema'

type Konteks = { context: { queryClient: QueryClient }; location: { href: string } }

/**
 * Penjaga dasbor kabupaten: belum masuk atau sesi habis → halaman masuk kabupaten, lalu kembali ke alamat asal. Hanya sesi
 * kabupaten yang dihapus; sesi bagian lain di peramban yang sama tetap.
 */
export async function muatSesiKabupaten({ context, location }: Konteks): Promise<{ sesiKabupaten: SesiKabupaten }> {
  const keMasuk = () => redirect({ to: '/kabupaten/admin/masuk', search: { ke: location.href } })
  if (!ambilTokenSesi('kabupaten')) throw keMasuk()
  try {
    return { sesiKabupaten: await context.queryClient.ensureQueryData(opsiSesiKabupaten()) }
  } catch (e) {
    if (e instanceof GalatApi && e.kode === 'UNAUTHENTICATED') {
      hapusSesi('kabupaten')
      context.queryClient.removeQueries({ queryKey: kunciKabupaten.semua })
      throw keMasuk()
    }
    throw e
  }
}
