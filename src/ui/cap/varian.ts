export const VARIAN_CAP = [
  'draf', 'menunggu', 'diproses', 'perlu-ttd', 'selesai', 'ditolak', 'dibatalkan', 'hidup', 'meninggal', 'pindah',
  'pendatang', 'belum-ktp-el', 'belum-ada-nik', 'data-belum-lengkap', 'asli',
] as const
export type VarianCap = (typeof VARIAN_CAP)[number]

/** Label ditulis biasa; CSS yang membuatnya KAPITAL, supaya pembaca layar membacanya sebagai kata. */
export const LABEL_CAP: Readonly<Record<VarianCap, string>> = {
  draf: 'Draf',
  menunggu: 'Menunggu',
  diproses: 'Diproses',
  'perlu-ttd': 'Perlu TTD',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
  hidup: 'Hidup',
  meninggal: 'Meninggal',
  pindah: 'Pindah',
  pendatang: 'Pendatang',
  'belum-ktp-el': 'Belum KTP-el',
  'belum-ada-nik': 'Belum ada NIK',
  'data-belum-lengkap': 'Data belum lengkap',
  asli: 'Asli',
}

/** SPEC §4.4 */
export const WARNA_CAP: Readonly<Record<VarianCap, string>> = {
  draf: 'text-tinta-2',
  menunggu: 'text-oker',
  diproses: 'text-biru',
  'perlu-ttd': 'text-stempel',
  selesai: 'text-hijau',
  ditolak: 'text-merah',
  dibatalkan: 'text-tinta-2 line-through',
  hidup: 'text-hijau',
  meninggal: 'text-merah',
  pindah: 'text-tinta-2',
  pendatang: 'text-biru',
  'belum-ktp-el': 'text-oker',
  'belum-ada-nik': 'text-oker',
  'data-belum-lengkap': 'text-oker',
  asli: 'text-hijau',
}
