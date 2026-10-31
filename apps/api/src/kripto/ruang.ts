/**
 * Ruang sandi (SPEC-V0.3 §7.6): teks yang ikut diautentikasi pada enkripsi dan menurunkan kunci indeks. Satu sumber untuk
 * semai dan modul penduduk, supaya penulisan dan pembacaan tidak berpisah. Memuat `desaId`, jadi sandi satu desa tidak
 * bisa dipindah ke baris desa lain.
 */
export const ruang = {
  nik: (desaId: string): string => `penduduk.nik:${desaId}`,
  telepon: (desaId: string): string => `penduduk.telepon:${desaId}`,
  nomorKk: (desaId: string): string => `keluarga.nomorKk:${desaId}`,
  /** Nilai lama dan baru NIK dan telepon di Riwayat penduduk (field lain polos). */
  riwayat: (desaId: string): string => `riwayat_penduduk.nilai:${desaId}`,
  /** Nilai telepon pada isi laporan perbaikan dari warga (NIK ikut dicakup CHECK basis data walau tidak boleh dilaporkan). */
  laporan: (desaId: string): string => `laporan_data.isi:${desaId}`,
  /** Seluruh tabel berkas impor penduduk yang menunggu konfirmasi (memuat NIK dan telepon polos dari berkas). */
  impor: (desaId: string): string => `impor_penduduk.isi:${desaId}`,
  /** Peta isian satu permohonan surat (isian jenis buatan desa bisa memuat nomor apa pun). */
  permohonanIsian: (desaId: string): string => `permohonan.isian:${desaId}`,
  /** Lembar surat yang dibekukan saat ditandatangani; memuat NIK pemohon dan subjek. */
  permohonanLembar: (desaId: string): string => `permohonan.lembar:${desaId}`,
  /** Indeks HMAC id pengguna sebagai kunci pengunci percobaan passphrase tanda tangan (tanpa menyimpan id polos di kunci). */
  passphrasePengguna: (desaId: string): string => `passphrase.pengguna:${desaId}`,
  /** Tanda tangan simulator: indeks HMAC hash dokumen (v0.4 mengganti dengan penyedia TTE nyata). */
  tandaTangan: (desaId: string): string => `permohonan.ttd:${desaId}`,
  /** Isi satu berkas surat (foto syarat atau pindaian); id baris ikut diautentikasi sehingga sandi tidak bisa dipindah ke baris lain. */
  berkas: (desaId: string, id: string): string => `berkas_surat.isi:${desaId}:${id}`,
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
