import { createContext, useContext } from 'react'
import type { IdentitasPublik } from '@/domain/publik/schema'

/** Identitas website desa yang sedang dibuka. Diisi kerangka website; di uji diisi `renderPublik`. */
export const PublikKonteks = createContext<IdentitasPublik | null>(null)

export function usePublik(): IdentitasPublik {
  const identitas = useContext(PublikKonteks)
  if (!identitas) throw new Error('usePublik dipakai di luar website desa')
  return identitas
}
