import { formatTanggal } from '../format/tanggal'
import { POLA_KODE_VERIFIKASI } from '../surat/verifikasi'
import type { Berlaku } from './schema'

/**
 * Rapikan kode yang diketik (fokus review 1): huruf kecil, spasi, dan tanda pisah apa pun diterima.
 * "ss 7k3m q9td", "SS-7K3M-Q9TD", dan "ss7k3mq9td" menjadi "SS-7K3M-Q9TD". Teks yang terlalu pendek dikembalikan tanpa pemisah.
 */
export function rapikanKode(teks: string): string {
  const polos = teks.toUpperCase().replace(/[\s‐-―-]+/g, '')
  if (polos.length <= 8) return polos
  return `${polos.slice(0, -8)}-${polos.slice(-8, -4)}-${polos.slice(-4)}`
}

const MENIT_MS = 60_000
/** Pengaman verifikasi (SPEC-V0.2 §3.4, fokus review 3): 10 kode salah dalam 10 menit mengunci verifikasi desa itu 10 menit. */
export const BATAS_VERIFIKASI = { gagal: 10, jendelaMs: 10 * MENIT_MS, kunciMs: 10 * MENIT_MS } as const
export const PESAN_VERIFIKASI_TERKUNCI = 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.'
export const PESAN_KODE_FORMAT = 'Kode verifikasi berbentuk seperti SS-7K3M-Q9TD.'
export const PESAN_KODE_TIDAK_DITEMUKAN = 'Kode tidak ditemukan. Periksa kembali, atau hubungi kantor desa.'

export const kodeSah = (kode: string): boolean => POLA_KODE_VERIFIKASI.test(kode)

/** "Siti Rahmah" → "S*** R*****": huruf pertama setiap kata, huruf lainnya bintang (SPEC §7.6). */
export const samarkanNama = (nama: string): string =>
  nama
    .trim()
    .split(/\s+/)
    .map((kata) => kata.slice(0, 1) + kata.slice(1).replace(/\p{L}/gu, '*'))
    .join(' ')

type DataBerlaku = { status: string; pembatalan: { pada: string } | null; berlakuSampai: string | null }

/** Masa berlaku surat yang sudah terbit pada `hariIni` (YYYY-MM-DD, WIB). Surat yang dibatalkan tetap asli (fokus review 2). */
export function hitungBerlaku(s: DataBerlaku, hariIni: string): Berlaku {
  if (s.status === 'dibatalkan' && s.pembatalan) return { status: 'dibatalkan', pada: s.pembatalan.pada }
  if (s.berlakuSampai !== null && s.berlakuSampai < hariIni) return { status: 'kedaluwarsa', sampai: s.berlakuSampai }
  return { status: 'berlaku', sampai: s.berlakuSampai }
}

export function teksBerlaku(b: Berlaku): string {
  if (b.status === 'dibatalkan') return `Dibatalkan pada ${formatTanggal(b.pada, 'pendek')}`
  if (b.status === 'kedaluwarsa') return `Kedaluwarsa (berlaku sampai ${formatTanggal(b.sampai, 'pendek')})`
  return b.sampai ? `Berlaku sampai ${formatTanggal(b.sampai, 'pendek')}` : 'Berlaku'
}
