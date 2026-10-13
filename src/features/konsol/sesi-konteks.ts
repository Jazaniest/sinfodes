import { createContext, useContext } from 'react'
import type { SesiKonsol } from '@/domain/konsol/schema'

export const SesiKonsolKonteks = createContext<SesiKonsol | null>(null)

/** Sesi konsol dari layout `/konsol`; layar konsol hanya dirender di dalamnya. */
export function useSesiKonsol(): SesiKonsol {
  const sesi = useContext(SesiKonsolKonteks)
  if (!sesi) throw new Error('useSesiKonsol dipakai di luar layout konsol')
  return sesi
}
