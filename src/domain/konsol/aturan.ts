import { formatAngka } from '../format/angka'
import { angkaRomawi } from '../format/romawi'
import { tanggalIsoWib } from '../format/tanggal'
import type { LangkahPersiapan } from '../wilayah/persiapan'
import type { StatusDesa } from '../wilayah/schema'
import type { Perhatian, RingkasanKonsol, Tagihan } from './schema'

const HARI_MS = 86_400_000
/** SPEC §11: desa Aktif atau Uji coba tanpa aktivitas selama ini dianggap tidak aktif. */
export const BATAS_TIDAK_AKTIF_HARI = 14
/** Desa Persiapan yang diam selama ini di langkah impor penduduk dianggap berhenti. */
export const BATAS_BERHENTI_HARI = 7

export const STATUS_TAGIHAN = ['lunas', 'menunggu', 'lewat-jatuh-tempo'] as const
export type StatusTagihan = (typeof STATUS_TAGIHAN)[number]
export const LABEL_STATUS_TAGIHAN: Readonly<Record<StatusTagihan, string>> = {
  lunas: 'Lunas',
  menunggu: 'Menunggu pembayaran',
  'lewat-jatuh-tempo': 'Lewat jatuh tempo',
}

/** Status tagihan pada `hariIni` (YYYY-MM-DD, WIB). */
export function statusTagihan(t: Pick<Tagihan, 'jatuhTempo' | 'dibayar'>, hariIni: string): StatusTagihan {
  if (t.dibayar !== null) return 'lunas'
  return hariIni > t.jatuhTempo ? 'lewat-jatuh-tempo' : 'menunggu'
}

/** "2026-09-24" → "Triwulan III 2026". */
export function labelTriwulan(tanggal: string): string {
  return `Triwulan ${angkaRomawi(Math.ceil(Number(tanggal.slice(5, 7)) / 3))} ${tanggal.slice(0, 4)}`
}

export type KeadaanDesaKonsol = { status: StatusDesa; aktivitasTerakhir: string | null; langkahBerikut: LangkahPersiapan | null }

const diamSedikitnya = (aktivitas: string | null, hari: number, sekarang: Date): boolean =>
  aktivitas === null || sekarang.getTime() - new Date(aktivitas).getTime() >= hari * HARI_MS

/**
 * Butir "Perlu perhatian" (SPEC §11). `tagihanLewat` null untuk pemantau, karena urusan tagihan hanya untuk Tim Sinfodes.
 * Butir bernilai nol tidak dikirim.
 */
export function hitungPerhatian(daftar: readonly KeadaanDesaKonsol[], tagihanLewat: number | null, sekarang: Date): Perhatian[] {
  const tidakAktif = daftar.filter(
    (d) => (d.status === 'Aktif' || d.status === 'Uji coba') && diamSedikitnya(d.aktivitasTerakhir, BATAS_TIDAK_AKTIF_HARI, sekarang),
  ).length
  const berhenti = daftar.filter(
    (d) => d.status === 'Persiapan' && d.langkahBerikut !== null && diamSedikitnya(d.aktivitasTerakhir, BATAS_BERHENTI_HARI, sekarang),
  ).length
  const hasil: Perhatian[] = []
  if (tidakAktif > 0) hasil.push({ jenis: 'tidak-aktif', jumlah: tidakAktif })
  if (berhenti > 0) hasil.push({ jenis: 'berhenti-persiapan', jumlah: berhenti })
  if (tagihanLewat) hasil.push({ jenis: 'tagihan-lewat', jumlah: tagihanLewat })
  return hasil
}

/** "3 desa tidak aktif 14 hari" (SPEC §11). */
export function kalimatPerhatian(p: Perhatian): string {
  const n = formatAngka(p.jumlah)
  switch (p.jenis) {
    case 'tidak-aktif':
      return `${n} desa tidak aktif ${BATAS_TIDAK_AKTIF_HARI} hari`
    case 'berhenti-persiapan':
      return `${n} desa berhenti di langkah persiapan`
    case 'tagihan-lewat':
      return `${n} tagihan lewat jatuh tempo`
  }
}

/** Angka platform dalam kalimat (SPEC §11). Tanpa angka surat: isi layanan desa bukan untuk Tim Sinfodes (SPEC-V0.2 §5.1). */
export function kalimatPlatform(r: Pick<RingkasanKonsol, 'desa'>): string {
  const { aktif, ujiCoba, persiapan, ditangguhkan } = r.desa
  return (
    `${formatAngka(aktif)} desa aktif, ${formatAngka(ujiCoba)} uji coba, ${formatAngka(persiapan)} dalam persiapan, ` +
    `dan ${formatAngka(ditangguhkan)} ditangguhkan.`
  )
}

/** Senin (YYYY-MM-DD, WIB) dari `jumlah` minggu terakhir, terlama dulu; minggu terakhir memuat `sekarang`. */
export function daftarMingguTerakhir(sekarang: Date, jumlah: number): string[] {
  const hari = new Date(`${tanggalIsoWib(sekarang)}T00:00:00Z`)
  const senin = hari.getTime() - ((hari.getUTCDay() + 6) % 7) * HARI_MS
  return Array.from({ length: jumlah }, (_, i) => new Date(senin - (jumlah - 1 - i) * 7 * HARI_MS).toISOString().slice(0, 10))
}

/** "Sungai Sialang" → "sungai-sialang". */
export const slugDesa = (nama: string): string =>
  nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
