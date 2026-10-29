import { pad2 } from '../format/kalender'
import { keWaktuWib, tanggalIsoWib, waktuIsoWib } from '../format/tanggal'

const HARI_MS = 86_400_000

/** Hari kalender WIB sebagai bilangan (hari sejak 1 Januari 1970). */
const nomorHari = (iso: string) => Math.floor(keWaktuWib(iso).getTime() / HARI_MS)
const hariKerja = (nomor: number) => {
  const hari = new Date(nomor * HARI_MS).getUTCDay()
  return hari !== 0 && hari !== 6
}

/**
 * Hari kerja (Senin-Jumat) yang sudah lewat sejak `mulai` sampai `sampai` (SPEC §7.1). Hari masuk tidak dihitung:
 * masuk Senin, dilihat Selasa → 1. Masuk Jumat atau Sabtu, dilihat Senin → 1.
 */
export function hariKerjaBerlalu(mulai: string, sampai: string): number {
  let jumlah = 0
  for (let h = nomorHari(mulai) + 1; h <= nomorHari(sampai); h++) if (hariKerja(h)) jumlah++
  return jumlah
}

/** Tanggal pertama periode (YYYY-MM-DD WIB): 14 hari terakhir berarti hari ini dan 13 hari sebelumnya. */
export const awalPeriode = (hari: number, sekarang: Date): string =>
  tanggalIsoWib(new Date(sekarang.getTime() - (hari - 1) * HARI_MS))

export type NadaTunggu = 'biasa' | 'oker' | 'merah'
export type LamaMenunggu = { hari: number; teks: string; nada: NadaTunggu }

/**
 * Kolom "Lama menunggu" (SPEC §7.1, §7.4). Permohonan terbuka dihitung sampai sekarang: oker bila lewat 1 hari kerja,
 * merah bila lewat 3. Permohonan yang sudah ditutup menampilkan lama prosesnya tanpa warna.
 */
export function lamaMenunggu(p: { masukPada: string; ditutupPada: string | null }, sekarang: Date): LamaMenunggu {
  const terbuka = p.ditutupPada === null
  const hari = hariKerjaBerlalu(p.masukPada, p.ditutupPada ?? waktuIsoWib(sekarang))
  const teks = hari === 0 ? (terbuka ? 'Hari ini' : 'Hari yang sama') : `${hari} hari kerja`
  const nada: NadaTunggu = !terbuka ? 'biasa' : hari > 3 ? 'merah' : hari > 1 ? 'oker' : 'biasa'
  return { hari, teks, nada }
}

/** Akhir masa berlaku (YYYY-MM-DD); null bila tanpa batas. Tanggal yang tidak ada di bulan tujuan → akhir bulan itu. */
export function berlakuSampai(tanggalSurat: string, bulan: number | null): string | null {
  if (bulan === null) return null
  const w = keWaktuWib(tanggalSurat)
  const urutan = w.getUTCMonth() + bulan
  const tahun = w.getUTCFullYear() + Math.floor(urutan / 12)
  const bulanKe = urutan % 12
  const akhirBulan = new Date(Date.UTC(tahun, bulanKe + 1, 0)).getUTCDate()
  return `${tahun}-${pad2(bulanKe + 1)}-${pad2(Math.min(w.getUTCDate(), akhirBulan))}`
}
