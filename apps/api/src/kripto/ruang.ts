/**
 * Ruang sandi (SPEC-V0.3 §7.6): teks yang ikut diautentikasi pada enkripsi dan menurunkan kunci indeks. Satu sumber untuk
 * semai dan modul penduduk, supaya penulisan dan pembacaan tidak berpisah. Memuat `desaId`, jadi sandi satu desa tidak
 * bisa dipindah ke baris desa lain.
 */
export const ruang = {
  nik: (desaId: string): string => `penduduk.nik:${desaId}`,
  telepon: (desaId: string): string => `penduduk.telepon:${desaId}`,
  nomorKk: (desaId: string): string => `keluarga.nomorKk:${desaId}`,
  /** Indeks HMAC email untuk jejak audit masuk gagal: email polos tidak disimpan. */
  emailPengguna: (desaId: string): string => `pengguna.email:${desaId}`,
} as const
