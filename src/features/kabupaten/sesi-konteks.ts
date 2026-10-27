import { createContext, useContext } from 'react'
import type { SesiKabupaten } from '@/domain/kabupaten/schema'

export const SesiKabupatenKonteks = createContext<SesiKabupaten | null>(null)

/** Sesi kabupaten dari layout dasbor; layar dasbor hanya dirender di dalamnya. */
export function useSesiKabupaten(): SesiKabupaten {
  const sesi = useContext(SesiKabupatenKonteks)
  if (!sesi) throw new Error('useSesiKabupaten dipakai di luar layout dasbor kabupaten')
  return sesi
}
