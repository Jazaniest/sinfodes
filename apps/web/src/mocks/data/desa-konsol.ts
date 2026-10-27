import type { Paket, PenggunaKonsol } from '@/domain/konsol/schema'
import type { StatusDesa } from '@/domain/wilayah/schema'

export type RencanaDesaKonsol = {
  nama: string
  /** Kode kecamatan tanpa titik (kunci tabel kode-wilayah). */
  kecamatan: string
  status: StatusDesa
  paket: Paket
  /** Hari sejak aktivitas terakhir, relatif terhadap tanggal acuan. */
  diam: number
  /** Khusus desa Persiapan: jumlah langkah persiapan yang sudah selesai berurutan. */
  langkah?: number
  /** Tagihan terakhir yang sudah jatuh tempo belum dibayar (SPEC §11: "1 tagihan lewat jatuh tempo"). */
  menunggak?: true
}

/**
 * 38 desa fiktif Konsol (SPEC §12.8). Bersama Sungai Sialang (Aktif) dan Tanjung Lamo (Persiapan): 32 desa di 12 kecamatan
 * Pelalawan dan 8 di kabupaten lain di Riau; Aktif 26, Persiapan 7, Uji coba 5, Ditangguhkan 2. Nama-namanya diuji tidak
 * sama dengan desa asli Pelalawan. Kuala Rengas dan Teluk Pauh adalah tetangga fiktif Sungai Sialang (SPEC §12.1).
 */
export const DESA_KONSOL: readonly RencanaDesaKonsol[] = [
  { nama: 'Sungai Gelugur', kecamatan: '140501', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Bukit Pelangi', kecamatan: '140501', status: 'Uji coba', paket: 'Dasar', diam: 30 },
  { nama: 'Air Tawar Jaya', kecamatan: '140501', status: 'Ditangguhkan', paket: 'Dasar', diam: 60 },
  { nama: 'Kerinci Indah', kecamatan: '140502', status: 'Aktif', paket: 'Lengkap', diam: 1 },
  { nama: 'Sungai Tapah', kecamatan: '140502', status: 'Aktif', paket: 'Dasar', diam: 0 },
  { nama: 'Talang Gading', kecamatan: '140503', status: 'Aktif', paket: 'Dasar', diam: 2 },
  { nama: 'Kuras Makmur', kecamatan: '140503', status: 'Aktif', paket: 'Dasar', diam: 16 },
  { nama: 'Beringin Jaya', kecamatan: '140503', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Lesung Indah', kecamatan: '140504', status: 'Uji coba', paket: 'Dasar', diam: 1 },
  { nama: 'Mayang Jaya', kecamatan: '140504', status: 'Aktif', paket: 'Dasar', diam: 3 },
  { nama: 'Sari Rejo', kecamatan: '140504', status: 'Aktif', paket: 'Dasar', diam: 1 },
  { nama: 'Gondai Baru', kecamatan: '140505', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Segati Hilir', kecamatan: '140505', status: 'Ditangguhkan', paket: 'Dasar', diam: 45 },
  { nama: 'Langgam Permai', kecamatan: '140505', status: 'Aktif', paket: 'Dasar', diam: 2 },
  { nama: 'Kuala Delik', kecamatan: '140506', status: 'Aktif', paket: 'Dasar', diam: 1 },
  { nama: 'Telayap Hilir', kecamatan: '140506', status: 'Uji coba', paket: 'Lengkap', diam: 2 },
  { nama: 'Sungai Rambai', kecamatan: '140506', status: 'Aktif', paket: 'Lengkap', diam: 0, menunggak: true },
  { nama: 'Lipai Jaya', kecamatan: '140507', status: 'Aktif', paket: 'Dasar', diam: 4 },
  { nama: 'Panduk Baru', kecamatan: '140507', status: 'Persiapan', paket: 'Dasar', diam: 2, langkah: 1 },
  { nama: 'Bunut Hilir', kecamatan: '140508', status: 'Aktif', paket: 'Dasar', diam: 21 },
  { nama: 'Balam Sari', kecamatan: '140508', status: 'Uji coba', paket: 'Dasar', diam: 0 },
  { nama: 'Sungai Kemuning', kecamatan: '140508', status: 'Aktif', paket: 'Lengkap', diam: 1 },
  { nama: 'Kuala Rengas', kecamatan: '140509', status: 'Aktif', paket: 'Dasar', diam: 0 },
  { nama: 'Teluk Pauh', kecamatan: '140509', status: 'Aktif', paket: 'Lengkap', diam: 1 },
  { nama: 'Serapung Laut', kecamatan: '140510', status: 'Persiapan', paket: 'Dasar', diam: 9, langkah: 2 },
  { nama: 'Tanjung Bakau', kecamatan: '140510', status: 'Aktif', paket: 'Dasar', diam: 3 },
  { nama: 'Sei Kijang Hulu', kecamatan: '140511', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Ogung Jaya', kecamatan: '140511', status: 'Persiapan', paket: 'Dasar', diam: 18, langkah: 2 },
  { nama: 'Petalangan Jaya', kecamatan: '140512', status: 'Aktif', paket: 'Dasar', diam: 2 },
  { nama: 'Rawang Kemuning', kecamatan: '140512', status: 'Persiapan', paket: 'Lengkap', diam: 1, langkah: 3 },
  { nama: 'Sungai Pinang Hilir', kecamatan: '140103', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Koto Damar', kecamatan: '140117', status: 'Aktif', paket: 'Dasar', diam: 2 },
  { nama: 'Tualang Permai', kecamatan: '140804', status: 'Aktif', paket: 'Lengkap', diam: 1 },
  { nama: 'Sungai Limau Hilir', kecamatan: '140802', status: 'Aktif', paket: 'Dasar', diam: 4 },
  { nama: 'Teluk Pinang Jaya', kecamatan: '140408', status: 'Aktif', paket: 'Dasar', diam: 1 },
  { nama: 'Mandah Permai', kecamatan: '140407', status: 'Uji coba', paket: 'Dasar', diam: 3 },
  { nama: 'Koto Rambai', kecamatan: '140906', status: 'Persiapan', paket: 'Dasar', diam: 3, langkah: 4 },
  { nama: 'Pangean Jaya', kecamatan: '140909', status: 'Persiapan', paket: 'Dasar', diam: 1, langkah: 0 },
]

/** Paket desa yang punya data panel (Sungai Sialang dan Tanjung Lamo). */
export const PAKET_DESA_DEMO: Readonly<Record<string, Paket>> = { desa_sungai_sialang: 'Lengkap', desa_tanjung_lamo: 'Dasar' }

/** Akun Konsol demo (SPEC §12.9). Akun pemantau v0.1 kini akun kabupaten (lihat `kabupaten-demo.ts`, SPEC-V0.2 §13). */
export const PENGGUNA_KONSOL_DEMO: readonly PenggunaKonsol[] = [
  { id: 'kns_dina', nama: 'Dina', jabatan: 'Tim Sinfodes', peran: 'tim', email: 'dina@sinfodes.id' },
]

/** Nama fiktif kepala desa, operator, dan Sekretaris Desa desa-desa Konsol. */
export const NAMA_KADES: readonly string[] = [
  'Abdul Rahman', 'Syafruddin', 'Muhammad Yunus', 'Zainal Abidin', 'Hasanuddin', 'Darmawan', 'Saharuddin', 'Ismail',
  'Junaidi', 'Azwar', 'Khairul Anwar', 'Ridwan', 'Sulaiman', 'Amiruddin', 'Nasrul', 'Herman Syah',
]
export const NAMA_OPERATOR: readonly string[] = [
  'Rina Wati', 'Fitri Handayani', 'Dewi Sartika', 'Yuliana', 'Nur Hidayah', 'Andi Saputra', 'Rizki Ramadhan', 'Wulan Sari',
  'Eka Putri', 'Fajar Hidayat', 'Siti Aisyah', 'Rahmat Hidayat',
]
export const NAMA_SEKDES: readonly string[] = [
  'Azhari', 'Bustami', 'Candra Wijaya', 'Dedi Kurniawan', 'Effendi', 'Firmansyah', 'Hamdani', 'Irawati', 'Jasmani', 'Kurniati',
  'Lukman Hakim', 'Marlina',
]

/**
 * Tujuh desa fiktif tambahan (SPEC-V0.2 §9.7), supaya Siak, Kampar, dan Indragiri Hilir punya cukup desa ber-Indeks untuk
 * peringkat antarkabupaten. Diproses setelah 38 desa di atas dengan aliran acaknya sendiri, jadi angka desa lama tidak
 * bergeser. Kuantan Singingi sengaja tetap hanya punya desa Persiapan.
 */
export const DESA_KONSOL_TAMBAHAN: readonly RencanaDesaKonsol[] = [
  { nama: 'Perawang Jaya', kecamatan: '140804', status: 'Aktif', paket: 'Dasar', diam: 1 },
  { nama: 'Teluk Lancang Baru', kecamatan: '140802', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Rimbo Datar', kecamatan: '140103', status: 'Aktif', paket: 'Dasar', diam: 2 },
  { nama: 'Pulau Gadang Jaya', kecamatan: '140117', status: 'Aktif', paket: 'Lengkap', diam: 0 },
  { nama: 'Sungai Bela Jaya', kecamatan: '140408', status: 'Aktif', paket: 'Dasar', diam: 1 },
  { nama: 'Tanjung Simpai', kecamatan: '140408', status: 'Aktif', paket: 'Dasar', diam: 3 },
  { nama: 'Sungai Nyiur', kecamatan: '140407', status: 'Aktif', paket: 'Lengkap', diam: 0 },
]
