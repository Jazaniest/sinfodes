import { LABEL_PERAN, type SesiAdmin } from '@/domain/pengguna/schema'
import type { AkunDemo } from './PilihPeranDemo'

/**
 * Akun yang sedang masuk tetapi tidak ada di pilihan peran (akun desa lain, mis. desa baru), supaya toolbar menampilkannya
 * apa adanya dan tidak jatuh ke pilihan pertama (tahap 6D).
 */
export function akunLain(akun: readonly AkunDemo[], sesi: SesiAdmin | undefined): { id: string; label: string } | null {
  if (!sesi || akun.some((a) => a.id === sesi.pengguna.id)) return null
  return { id: sesi.pengguna.id, label: `${LABEL_PERAN[sesi.pengguna.peran]} · ${sesi.pengguna.nama} · ${sesi.desa.nama}` }
}
