import { createContext, useContext } from 'react'
import type { SesiAdmin } from '@/domain/pengguna/schema'

/** Sesi admin yang aktif. Diisi kerangka panel; di uji diisi `renderPanel`. */
export const SesiAdminKonteks = createContext<SesiAdmin | null>(null)

export function useSesiAdmin(): SesiAdmin {
  const sesi = useContext(SesiAdminKonteks)
  if (!sesi) throw new Error('useSesiAdmin dipakai di luar panel admin')
  return sesi
}
