import type { PenggunaKonsol } from '@/domain/konsol/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { cariSesiBantuan, masihBerlaku, sesiIdDariPermintaan } from './bantuan'
import { ambilDb } from './db'
import { balasGalat } from './http'
import { desaKonteks, konteksPermintaan, tanpaKonteks } from './konteks-permintaan'
import type { AkunWarga } from './tipe-db'

export const tokenUntuk = (penggunaId: string): string => `demo.${penggunaId}`

/** Desa dari alamat permintaan harus sama dengan desa pemilik sesi (SPEC-V0.2 §4.3); tanpa konteks alamat selalu lolos. */
function desaSesuaiAlamat(request: Request, desaId: string): boolean {
  const k = konteksPermintaan(request)
  return tanpaKonteks(k) || desaKonteks(ambilDb(), k)?.id === desaId
}

/**
 * Pengguna semu sesi bantuan Tim Sinfodes (SPEC-V0.2 §5.3). Tidak berlaku lagi begitu desa mencabut akses atau waktunya habis,
 * dan hanya di alamat desa pemberi akses.
 */
function penggunaBantuan(request: Request, sesiId: string): PenggunaSesi | null {
  const db = ambilDb()
  const temu = cariSesiBantuan(db, sesiId)
  if (!temu || !masihBerlaku(temu.akses, new Date()) || !desaSesuaiAlamat(request, temu.akses.desaId)) return null
  const email = db.penggunaKonsol.find((p) => p.id === temu.sesi.olehId)?.email ?? ''
  return {
    id: `bantuan_${sesiId}`, desaId: temu.akses.desaId, nama: temu.sesi.olehNama, jabatan: 'Tim Sinfodes', peran: 'bantuan',
    dusunId: null, email, aktif: true,
  }
}

export function penggunaDariPermintaan(request: Request): PenggunaSesi | null {
  const sesiBantuan = sesiIdDariPermintaan(request)
  if (sesiBantuan !== null) return penggunaBantuan(request, sesiBantuan)
  const cocok = /^Bearer demo\.(.+)$/.exec(request.headers.get('Authorization') ?? '')
  if (!cocok) return null
  const pengguna = ambilDb().pengguna.find((p) => p.id === cocok[1] && p.aktif)
  return pengguna && desaSesuaiAlamat(request, pengguna.desaId) ? pengguna : null
}

/** Pengguna dari sesi, atau Response 401 yang langsung dikembalikan handler. */
export function butuhPengguna(request: Request): PenggunaSesi | Response {
  return (
    penggunaDariPermintaan(request) ??
    balasGalat('UNAUTHENTICATED', 'Sesi Anda sudah berakhir. Silakan masuk lagi.', 401)
  )
}

export const tokenWargaUntuk = (pendudukId: string): string => `warga.${pendudukId}`

export type WargaMasuk = { akun: AkunWarga; penduduk: Penduduk }

/** Warga dari token layanan warga. Token panel admin tidak berlaku di sini, dan sebaliknya (fokus review 1). */
export function wargaDariPermintaan(request: Request): WargaMasuk | null {
  const cocok = /^Bearer warga\.(.+)$/.exec(request.headers.get('Authorization') ?? '')
  if (!cocok) return null
  const db = ambilDb()
  const akun = db.akunWarga.find((a) => a.pendudukId === cocok[1])
  const penduduk = db.penduduk.find((p) => p.id === cocok[1] && p.statusDasar === 'Hidup')
  return akun && penduduk && desaSesuaiAlamat(request, penduduk.desaId) ? { akun, penduduk } : null
}

/** Warga dari sesi, atau Response 401 yang langsung dikembalikan handler. */
export function butuhWarga(request: Request): WargaMasuk | Response {
  return wargaDariPermintaan(request) ?? balasGalat('UNAUTHENTICATED', 'Sesi Anda sudah berakhir. Silakan masuk lagi.', 401)
}

export const tokenKonsolUntuk = (penggunaId: string): string => `konsol.${penggunaId}`

/** Akun konsol dari token. Token panel admin dan warga tidak berlaku di sini, dan sebaliknya (fokus review 2 tahap 6A). */
export function penggunaKonsolDariPermintaan(request: Request): PenggunaKonsol | null {
  const cocok = /^Bearer konsol\.(.+)$/.exec(request.headers.get('Authorization') ?? '')
  if (!cocok) return null
  const k = konteksPermintaan(request)
  if (!tanpaKonteks(k) && k.jenis !== 'konsol') return null
  return ambilDb().penggunaKonsol.find((p) => p.id === cocok[1]) ?? null
}

/** Akun konsol dari sesi, atau Response 401 yang langsung dikembalikan handler. */
export function butuhPenggunaKonsol(request: Request): PenggunaKonsol | Response {
  return penggunaKonsolDariPermintaan(request) ?? balasGalat('UNAUTHENTICATED', 'Sesi konsol Anda sudah berakhir. Silakan masuk lagi.', 401)
}
