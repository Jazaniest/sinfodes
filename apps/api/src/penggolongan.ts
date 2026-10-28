/**
 * Penggolongan setiap tabel (SPEC-V0.3 §7.2). Uji meta gagal bila ada tabel di basis data yang tidak tercantum di sini,
 * atau tabel desa-privat tanpa RLS paksa.
 */
export type Golongan = 'desa-privat' | 'terbit' | 'platform' | 'agregat' | 'audit'

export const GOLONGAN_TABEL: Readonly<Record<string, Golongan>> = {
  _migrasi: 'platform',
  desa: 'platform',
  alias_alamat: 'platform',
  kunci_data: 'platform',
  sesi: 'platform',
  // Identitas lintas desa dipisah dengan hak tabel per peran (SPEC-V0.3 §7.3); pengunci Konsol dan kabupaten juga ber-RLS per peran.
  kabupaten_mitra: 'platform',
  pengguna_kabupaten: 'platform',
  sesi_kabupaten: 'platform',
  pengguna_konsol: 'platform',
  sesi_konsol: 'platform',
  kunci_masuk_platform: 'platform',
  // Akses bantuan (SPEC-V0.3 §8.6): status dan tiket adalah data platform yang ditulis desa; keduanya ber-RLS per peran.
  akses_bantuan: 'platform',
  tiket_bantuan: 'platform',
  dusun: 'desa-privat',
  pengguna: 'desa-privat',
  keluarga: 'desa-privat',
  penduduk: 'desa-privat',
  akun_warga: 'desa-privat',
  sesi_warga: 'desa-privat',
  kunci_masuk_desa: 'desa-privat',
  sesi_bantuan: 'desa-privat',
  jejak_audit: 'audit',
  jejak_bantuan: 'audit',
  jejak_audit_platform: 'audit',
}

export const tabelDengan = (golongan: Golongan): string[] =>
  Object.entries(GOLONGAN_TABEL).filter(([, g]) => g === golongan).map(([nama]) => nama)
