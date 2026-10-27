import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { ambilTokenSesi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { opsiSesi } from '@/api/sesi'
import { hapusSesi } from '@/app/sesi'
import type { SesiAdmin } from '@/domain/pengguna/schema'

type Konteks = { context: { queryClient: QueryClient }; location: { href: string } }

/** Penjaga panel: belum masuk atau sesi habis → halaman masuk, lalu kembali ke alamat asal (SPEC §3.5). */
export async function muatSesiPanel({ context, location }: Konteks): Promise<{ sesi: SesiAdmin }> {
  const keMasuk = () => redirect({ to: '/admin/masuk', search: { ke: location.href } })
  if (!ambilTokenSesi()) throw keMasuk()
  try {
    return { sesi: await context.queryClient.ensureQueryData(opsiSesi()) }
  } catch (e) {
    if (e instanceof GalatApi && e.kode === 'UNAUTHENTICATED') {
      hapusSesi()
      context.queryClient.clear()
      throw keMasuk()
    }
    throw e
  }
}
