import { createContext, useContext } from 'react'
import type { SesiWarga } from '@/domain/warga/sesi'

/** Sesi warga yang aktif. Diisi kerangka warga; di uji diisi `renderWarga`. */
export const SesiWargaKonteks = createContext<SesiWarga | null>(null)

export function useSesiWarga(): SesiWarga {
  const sesi = useContext(SesiWargaKonteks)
  if (!sesi) throw new Error('useSesiWarga dipakai di luar layanan warga')
  return sesi
}
