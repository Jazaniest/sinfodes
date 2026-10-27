import type { PeranKabupaten } from './schema'

/** Kemampuan akun kabupaten (SPEC-V0.2 §8.1). Siaran dipakai 7B-3, tenggat laporan dipakai 7B-2. */
export const KEMAMPUAN_KABUPATEN = ['kab.lihat', 'kab.siaran', 'kab.tenggat', 'kab.pengguna'] as const
export type KemampuanKabupaten = (typeof KEMAMPUAN_KABUPATEN)[number]

export const HAK_AKSES_KABUPATEN: Readonly<Record<PeranKabupaten, ReadonlySet<KemampuanKabupaten>>> = {
  admin: new Set(KEMAMPUAN_KABUPATEN),
  // Peninjau untuk pimpinan seperti Kepala Dinas atau Bupati: melihat semua dasbor dan mengunduh, tanpa mengubah apa pun.
  peninjau: new Set<KemampuanKabupaten>(['kab.lihat']),
}

export function bolehKabupaten(peran: PeranKabupaten, kemampuan: KemampuanKabupaten): boolean {
  return HAK_AKSES_KABUPATEN[peran].has(kemampuan)
}
