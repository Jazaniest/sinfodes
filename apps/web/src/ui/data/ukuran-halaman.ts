/** Ukuran halaman daftar (SPEC §6.2): 25 (bawaan), 50, atau 100. */
export const UKURAN_HALAMAN = [25, 50, 100] as const
export type UkuranHalaman = (typeof UKURAN_HALAMAN)[number]
