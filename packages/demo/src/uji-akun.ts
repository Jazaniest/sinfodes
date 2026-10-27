/**
 * Konstanta uji yang dipakai bersama oleh uji frontend (API tiruan) dan uji server (API nyata), supaya kedua sisi
 * bertanya tentang dunia demo yang sama.
 */

/** Kamis, 24 September 2026 pukul 09.00 WIB: "sekarang" di semua uji yang memakai dunia demo. */
export const SEKARANG_UJI = new Date('2026-09-24T02:00:00Z')

export const AKUN_UJI = {
  operator: 'pgn_rosmiati',
  sekdes: 'pgn_hendri',
  kades: 'pgn_nasir',
  kaurKeuangan: 'pgn_nurhayati',
  kadus: 'pgn_sukardi',
} as const

/** Operator Desa Tanjung Lamo, desa berstatus Persiapan (SPEC §12.2). */
export const AKUN_DESA_BARU_UJI = 'pgn_yusri'
