import type { Pengguna } from '@/domain/pengguna/schema'
import { ambilDb } from './db'
import { balasGalat } from './http'

export const tokenUntuk = (penggunaId: string): string => `demo.${penggunaId}`

export function penggunaDariPermintaan(request: Request): Pengguna | null {
  const cocok = /^Bearer demo\.(.+)$/.exec(request.headers.get('Authorization') ?? '')
  if (!cocok) return null
  return ambilDb().pengguna.find((p) => p.id === cocok[1] && p.aktif) ?? null
}

/** Pengguna dari sesi, atau Response 401 yang langsung dikembalikan handler. */
export function butuhPengguna(request: Request): Pengguna | Response {
  return (
    penggunaDariPermintaan(request) ??
    balasGalat('UNAUTHENTICATED', 'Sesi Anda sudah berakhir. Silakan masuk lagi.', 401)
  )
}
