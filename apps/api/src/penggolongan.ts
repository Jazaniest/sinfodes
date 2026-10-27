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
  dusun: 'desa-privat',
  pengguna: 'desa-privat',
  keluarga: 'desa-privat',
  penduduk: 'desa-privat',
  jejak_audit: 'audit',
}

export const tabelDengan = (golongan: Golongan): string[] =>
  Object.entries(GOLONGAN_TABEL).filter(([, g]) => g === golongan).map(([nama]) => nama)
