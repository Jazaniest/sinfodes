/**
 * Ruang sandi (SPEC-V0.3 §7.6): teks yang ikut diautentikasi pada enkripsi dan menurunkan kunci indeks. Satu sumber untuk
 * semai dan modul penduduk, supaya penulisan dan pembacaan tidak berpisah. Memuat `desaId`, jadi sandi satu desa tidak
 * bisa dipindah ke baris desa lain.
 */
export const ruang = {
  nik: (desaId: string): string => `penduduk.nik:${desaId}`,
  telepon: (desaId: string): string => `penduduk.telepon:${desaId}`,
  nomorKk: (desaId: string): string => `keluarga.nomorKk:${desaId}`,
  /** Nomor WhatsApp akun warga, disandikan seperti telepon penduduk. */
  whatsapp: (desaId: string): string => `akun_warga.whatsapp:${desaId}`,
  /** Rahasia TOTP akun Konsol (lintas desa, jadi satu ruang tetap). */
  totpKonsol: 'pengguna_konsol.totp',
  /** Indeks HMAC email akun kabupaten (kunci percobaan dan jejak audit); memuat kode kabupaten. */
  emailKabupaten: (kodeKabupaten: string): string => `pengguna_kabupaten.email:${kodeKabupaten}`,
  /** Indeks HMAC email akun Konsol (kunci percobaan dan jejak audit). */
  emailKonsol: 'pengguna_konsol.email',
  /** Indeks HMAC email untuk jejak audit masuk gagal: email polos tidak disimpan. */
  emailPengguna: (desaId: string): string => `pengguna.email:${desaId}`,
} as const
