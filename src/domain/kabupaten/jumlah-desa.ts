/**
 * Jumlah desa di kabupaten Riau, untuk angka adopsi di dasbor dan portal (SPEC-V0.2 §8.3) dan kategori Paling Merata
 * (SPEC-V0.2 §9.4). Kelurahan tidak dihitung karena tidak memakai sistem informasi desa. Diverifikasi 18 Okt 2026 dari
 * Wikipedia: Pelalawan 104 desa di 12 kecamatan (dan 14 kelurahan), Siak 122 desa di 14 kecamatan (dan 9 kelurahan).
 * Ditambahkan 19 Okt 2026 dari "Daftar kabupaten dan kota di Riau": Kampar 242, Bengkalis 136, Indragiri Hilir 197, dan
 * Kuantan Singingi 218. Kabupaten yang belum tercatat di sini memakai jumlah desa pelanggannya.
 */
export const JUMLAH_DESA_KABUPATEN: Readonly<Record<string, number>> = {
  '14.01': 242,
  '14.03': 136,
  '14.04': 197,
  '14.05': 104,
  '14.08': 122,
  '14.09': 218,
}
