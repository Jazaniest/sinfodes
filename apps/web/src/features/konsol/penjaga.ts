import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { ambilTokenSesi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { kunciKonsol, opsiSesiKonsol } from '@/api/konsol'
import { hapusSesi } from '@/app/sesi'
import type { SesiKonsol } from '@/domain/konsol/schema'

type Konteks = { context: { queryClient: QueryClient }; location: { href: string } }

/**
 * Penjaga Konsol (SPEC §3.5): belum masuk atau sesi habis → halaman masuk konsol, lalu kembali ke alamat asal.
 * Hanya sesi konsol yang dihapus; sesi panel admin dan warga di peramban yang sama tetap (fokus review 2).
 */
export async function muatSesiKonsol({ context, location }: Konteks): Promise<{ sesiKonsol: SesiKonsol }> {
  const keMasuk = () => redirect({ to: '/konsol/masuk', search: { ke: location.href } })
  if (!ambilTokenSesi('konsol')) throw keMasuk()
  try {
    return { sesiKonsol: await context.queryClient.ensureQueryData(opsiSesiKonsol()) }
  } catch (e) {
    if (e instanceof GalatApi && e.kode === 'UNAUTHENTICATED') {
      hapusSesi('konsol')
      context.queryClient.removeQueries({ queryKey: kunciKonsol.semua })
      throw keMasuk()
    }
    throw e
  }
}
