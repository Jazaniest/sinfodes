import type { QueryClient } from '@tanstack/react-query'
import { kunciKonsol, masukKonsol } from '@/api/konsol'
import { kunciSesi, masuk } from '@/api/sesi'
import { simpanSesi } from '@/app/sesi'
import type { SesiKonsol } from '@/domain/konsol/schema'
import type { SesiAdmin } from '@/domain/pengguna/schema'

/**
 * Masuk sebagai akun demo (fokus review 2). Semua kueri di-reset sehingga data milik peran lama dibuang,
 * dan kueri yang sedang tampil dimuat ulang dengan token baru. Sesi baru langsung ditaruh di cache dan
 * pemuatan ulang tidak ditunggu, sehingga `router.invalidate()` sesudahnya mengganti kerangka (menu, peran)
 * sebelum data peran baru tiba; data baru tidak pernah tampil di dalam kerangka peran lama.
 */
export async function masukDemo(email: string, kataSandi: string, queryClient: QueryClient): Promise<SesiAdmin> {
  const { token, sesi } = await masuk(email, kataSandi)
  simpanSesi(token)
  void queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== kunciSesi[0] })
  queryClient.setQueryData(kunciSesi, sesi)
  return sesi
}

/** Masuk Konsol sebagai akun demo; sesi panel admin dan warga di peramban yang sama tidak disentuh. */
export async function masukKonsolDemo(email: string, kataSandi: string, queryClient: QueryClient): Promise<SesiKonsol> {
  const { token, sesi } = await masukKonsol(email, kataSandi)
  simpanSesi(token, 'konsol')
  queryClient.removeQueries({ queryKey: kunciKonsol.semua })
  queryClient.setQueryData(kunciKonsol.sesi, sesi)
  return sesi
}
