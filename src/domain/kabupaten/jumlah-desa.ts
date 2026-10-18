/**
 * Jumlah desa di kabupaten mitra, untuk angka adopsi di dasbor dan portal (SPEC-V0.2 §8.3). Kelurahan tidak dihitung karena
 * tidak memakai sistem informasi desa. Diverifikasi 18 Okt 2026 dari Wikipedia: Pelalawan 104 desa di 12 kecamatan (dan
 * 14 kelurahan), Siak 122 desa di 14 kecamatan (dan 9 kelurahan). Kabupaten mitra baru di demo memakai jumlah desa
 * pelanggannya sampai angkanya ditambahkan di sini.
 */
export const JUMLAH_DESA_KABUPATEN: Readonly<Record<string, number>> = { '14.05': 104, '14.08': 122 }
