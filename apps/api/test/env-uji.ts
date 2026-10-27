import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { UrlDb } from '../src/konfigurasi'

export const BERKAS_ENV_LOKAL = fileURLToPath(new URL('../.env.local', import.meta.url))
export const NAMA_TEMPLAT = 'sinfodes_templat'
export const AWALAN_DB_UJI = 'sinfodes_uji_'

/** Kunci tetap khusus uji. Tidak berhubungan dengan kunci `.env.local` mana pun dan tidak melindungi data nyata. */
export const KUNCI_UTAMA_UJI = createHash('sha256').update('sinfodes-uji-kunci-utama').digest()
export const KUNCI_INDEKS_UJI = createHash('sha256').update('sinfodes-uji-kunci-indeks').digest()
export const KID_UJI = 'k1'

export const PESAN_TANPA_DB =
  'PostgreSQL tidak dapat dihubungi atau belum disiapkan. Nyalakan PostgreSQL di Laragon (minimal versi 15), ' +
  'jalankan `pnpm --filter @sinfodes/api db:siapkan`, lalu ulangi.'

/** Memuat apps/api/.env.local ke process.env bila ada dan belum dimuat. Mengembalikan false bila berkas tidak ada. */
export function muatEnvLokal(): boolean {
  if (process.env.DB_URL_MIGRASI) return true
  if (!existsSync(BERKAS_ENV_LOKAL)) return false
  process.loadEnvFile(BERKAS_ENV_LOKAL)
  return Boolean(process.env.DB_URL_MIGRASI)
}

/** URL yang sama dengan basis data lain pada server yang sama. */
export const keBasisData = (url: string, basisData: string): string => {
  const u = new URL(url)
  u.pathname = `/${basisData}`
  return u.toString()
}

export function urlDbDari(env: Record<string, string | undefined>, basisData: string): UrlDb {
  const ambil = (k: string): string => {
    const v = env[k]
    if (!v) throw new Error(`${k} belum diisi di apps/api/.env.local. ${PESAN_TANPA_DB}`)
    return keBasisData(v, basisData)
  }
  return {
    migrasi: ambil('DB_URL_MIGRASI'),
    desa: ambil('DB_URL_DESA'),
    kabupaten: ambil('DB_URL_KABUPATEN'),
    konsol: ambil('DB_URL_KONSOL'),
    publik: ambil('DB_URL_PUBLIK'),
  }
}
