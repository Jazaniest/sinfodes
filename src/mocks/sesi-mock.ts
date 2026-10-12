import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { ambilDb } from './db'
import { balasGalat } from './http'
import type { AkunWarga } from './tipe-db'

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

export const tokenWargaUntuk = (pendudukId: string): string => `warga.${pendudukId}`

export type WargaMasuk = { akun: AkunWarga; penduduk: Penduduk }

/** Warga dari token layanan warga. Token panel admin tidak berlaku di sini, dan sebaliknya (fokus review 1). */
export function wargaDariPermintaan(request: Request): WargaMasuk | null {
  const cocok = /^Bearer warga.(.+)$/.exec(request.headers.get('Authorization') ?? '')
  if (!cocok) return null
  const db = ambilDb()
  const akun = db.akunWarga.find((a) => a.pendudukId === cocok[1])
  const penduduk = db.penduduk.find((p) => p.id === cocok[1] && p.statusDasar === 'Hidup')
  return akun && penduduk ? { akun, penduduk } : null
}

/** Warga dari sesi, atau Response 401 yang langsung dikembalikan handler. */
export function butuhWarga(request: Request): WargaMasuk | Response {
  return wargaDariPermintaan(request) ?? balasGalat('UNAUTHENTICATED', 'Sesi Anda sudah berakhir. Silakan masuk lagi.', 401)
}
