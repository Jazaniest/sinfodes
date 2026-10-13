import type { QueryClient } from '@tanstack/react-query'
import { kunciKonsol, masukKonsol } from '@/api/konsol'
import { simpanSesi } from '@/app/sesi'
import type { SesiKonsol } from '@/domain/konsol/schema'

/**
 * Masuk Konsol sebagai akun demo; sesi panel admin dan warga di peramban yang sama tidak disentuh. Sengaja terpisah dari
 * `masuk-demo.ts`: modul itu dipakai toolbar demo di kerangka akar, jadi impornya masuk JS awal semua halaman (SPEC §13.4).
 */
export async function masukKonsolDemo(email: string, kataSandi: string, queryClient: QueryClient): Promise<SesiKonsol> {
  const { token, sesi } = await masukKonsol(email, kataSandi)
  simpanSesi(token, 'konsol')
  queryClient.removeQueries({ queryKey: kunciKonsol.semua })
  queryClient.setQueryData(kunciKonsol.sesi, sesi)
  return sesi
}
