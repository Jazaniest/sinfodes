import { dataBelumLengkap, wajibKtpBelumRekam } from './filter'
import type { Penduduk } from './schema'

/** Nama penanda sama dengan varian Cap di `ui/cap/varian.ts` (diuji). */
export const PENANDA_PENDUDUK = [
  'hidup', 'meninggal', 'pindah', 'hilang', 'pendatang', 'belum-ada-nik', 'belum-ktp-el', 'data-belum-lengkap',
] as const
export type PenandaPenduduk = (typeof PENANDA_PENDUDUK)[number]

const STATUS: Readonly<Record<Penduduk['statusDasar'], PenandaPenduduk>> = {
  Hidup: 'hidup',
  Meninggal: 'meninggal',
  Pindah: 'pindah',
  Hilang: 'hilang',
}

export function penandaStatus(p: Pick<Penduduk, 'statusDasar'>): PenandaPenduduk {
  return STATUS[p.statusDasar]
}

/**
 * Penanda untuk daftar dan profil (SPEC §4.4, §6.2). Status Hidup tidak ditulis, karena itu bawaan.
 * Penduduk yang sudah tidak tinggal di desa hanya diberi status: pengecekan KTP dan kelengkapan tidak relevan lagi.
 */
export function penandaPenduduk(p: Penduduk, ctx: { kodeWilayahDesa: string; hariIni: Date }): PenandaPenduduk[] {
  if (p.statusDasar !== 'Hidup') return [penandaStatus(p)]
  const hasil: PenandaPenduduk[] = []
  if (p.nik === null) hasil.push('belum-ada-nik')
  else if (!p.nik.startsWith(ctx.kodeWilayahDesa)) hasil.push('pendatang')
  if (wajibKtpBelumRekam(p, ctx.hariIni)) hasil.push('belum-ktp-el')
  if (dataBelumLengkap(p, ctx.hariIni)) hasil.push('data-belum-lengkap')
  return hasil
}
