import type { Konfigurasi } from '../konfigurasi'

/**
 * Empat keluarga pelaku (SPEC-V0.3 §8.1): masing-masing punya cookie, tabel sesi, dan masa berlaku sendiri. Keluarga ditentukan
 * dari jalur rute, bukan dari isi cookie, jadi cookie satu keluarga tidak pernah dibaca rute keluarga lain.
 */
export type KeluargaPelaku = 'panel' | 'warga' | 'konsol' | 'kabupaten'

const SUFIKS_KUKI: Readonly<Record<KeluargaPelaku, string>> = { panel: 'panel', warga: 'warga', konsol: 'konsol', kabupaten: 'kab' }

export const namaKuki = (keluarga: KeluargaPelaku, awalan: Konfigurasi['cookieAwalan']): string => `${awalan}${SUFIKS_KUKI[keluarga]}`

/** Batas masa sesi (SPEC-V0.3 §8.2). `mutlakMs` null: tanpa batas mutlak (warga, yang menganggurnya bergeser). */
export const ATURAN_SESI: Readonly<Record<KeluargaPelaku, { menganggurMs: number; mutlakMs: number | null }>> = {
  panel: { menganggurMs: 2 * 3600_000, mutlakMs: 12 * 3600_000 },
  warga: { menganggurMs: 30 * 24 * 3600_000, mutlakMs: null },
  konsol: { menganggurMs: 30 * 60_000, mutlakMs: 8 * 3600_000 },
  kabupaten: { menganggurMs: 2 * 3600_000, mutlakMs: 12 * 3600_000 },
}

/**
 * Sesi bantuan Tim Sinfodes (SPEC-V0.3 §8.6) hidup di keluarga panel tetapi lebih pendek, seperti sesi Konsol; batas lain adalah
 * masa berlaku aksesnya sendiri, diperiksa pada setiap permintaan.
 */
export const ATURAN_SESI_BANTUAN: Readonly<{ menganggurMs: number; mutlakMs: number }> = { menganggurMs: 30 * 60_000, mutlakMs: 8 * 3600_000 }

/** Jalur di bawah /api/v1 (mis. `/warga/sesi`) menjadi keluarga pelaku; selain warga, Konsol, dan kabupaten berarti panel. */
export function keluargaDariJalur(jalur: string): KeluargaPelaku {
  if (/^\/warga(\/|$)/.test(jalur)) return 'warga'
  if (/^\/konsol(\/|$)/.test(jalur)) return 'konsol'
  if (/^\/kabupaten(\/|$)/.test(jalur)) return 'kabupaten'
  return 'panel'
}

/** Sesi masih berlaku menurut aturan keluarganya: tidak dicabut, belum menganggur terlalu lama, belum melewati batas mutlak. */
export function sesiMasihBerlaku(
  keluarga: KeluargaPelaku,
  s: { terakhirAktif: Date; kedaluwarsaMutlak?: Date | null; dicabut: Date | null },
  sekarang: Date,
): boolean {
  const t = sekarang.getTime()
  const aturan = ATURAN_SESI[keluarga]
  if (s.dicabut !== null) return false
  if (t - s.terakhirAktif.getTime() >= aturan.menganggurMs) return false
  return s.kedaluwarsaMutlak == null || t < s.kedaluwarsaMutlak.getTime()
}
