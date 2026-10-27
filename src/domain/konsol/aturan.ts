import { formatAngka } from '../format/angka'
import { angkaRomawi } from '../format/romawi'
import { tanggalIsoWib } from '../format/tanggal'
import type { LangkahPersiapan } from '../wilayah/persiapan'
import type { StatusDesa } from '../wilayah/schema'
import type { Perhatian, RingkasanKonsol } from './schema'

const HARI_MS = 86_400_000
/** SPEC §11: desa Aktif atau Uji coba tanpa aktivitas selama ini dianggap tidak aktif. */
export const BATAS_TIDAK_AKTIF_HARI = 14
/** Desa Persiapan yang diam selama ini di langkah impor penduduk dianggap berhenti. */
export const BATAS_BERHENTI_HARI = 7

/** "2026-09-24" → "Triwulan III 2026". */
export function labelTriwulan(tanggal: string): string {
  return `Triwulan ${angkaRomawi(Math.ceil(Number(tanggal.slice(5, 7)) / 3))} ${tanggal.slice(0, 4)}`
}

/** Perpindahan status desa yang boleh dilakukan Tim Sinfodes (rencana 7D-2 keputusan 7). */
export const PERPINDAHAN_STATUS: Readonly<Record<StatusDesa, readonly StatusDesa[]>> = {
  Persiapan: ['Uji coba'],
  'Uji coba': ['Aktif'],
  Aktif: ['Ditangguhkan'],
  Ditangguhkan: ['Aktif'],
}

export type KeadaanDesaKonsol = { status: StatusDesa; aktivitasTerakhir: string | null; langkahBerikut: LangkahPersiapan | null }

const diamSedikitnya = (aktivitas: string | null, hari: number, sekarang: Date): boolean =>
  aktivitas === null || sekarang.getTime() - new Date(aktivitas).getTime() >= hari * HARI_MS

/**
 * Butir "Perlu perhatian" (SPEC §11). `tagihanLewat` null untuk pemantau, karena urusan tagihan hanya untuk Tim Sinfodes.
 * Butir bernilai nol tidak dikirim.
 */
export function hitungPerhatian(
  daftar: readonly KeadaanDesaKonsol[],
  tagihanLewat: number | null,
  sekarang: Date,
  buktiMenunggu: number | null = null,
): Perhatian[] {
  const tidakAktif = daftar.filter(
    (d) => (d.status === 'Aktif' || d.status === 'Uji coba') && diamSedikitnya(d.aktivitasTerakhir, BATAS_TIDAK_AKTIF_HARI, sekarang),
  ).length
  const berhenti = daftar.filter(
    (d) => d.status === 'Persiapan' && d.langkahBerikut !== null && diamSedikitnya(d.aktivitasTerakhir, BATAS_BERHENTI_HARI, sekarang),
  ).length
  const hasil: Perhatian[] = []
  // Pekerjaan harian Tim Sinfodes didahulukan: bukti bayar yang menunggu diperiksa.
  if (buktiMenunggu) hasil.push({ jenis: 'bukti-menunggu', jumlah: buktiMenunggu })
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
    case 'bukti-menunggu':
      return `${n} bukti bayar menunggu verifikasi`
  }
}

/** Angka platform dalam kalimat (SPEC §11). Tanpa angka surat: isi layanan desa bukan untuk Tim Sinfodes (SPEC-V0.2 §5.1). */
export function kalimatPlatform(r: Pick<RingkasanKonsol, 'desa' | 'kabupatenMitra'>): string {
  const { aktif, ujiCoba, persiapan, ditangguhkan } = r.desa
  const kabupaten = r.kabupatenMitra > 0 ? `${formatAngka(r.kabupatenMitra)} kabupaten mitra.` : 'Belum ada kabupaten mitra.'
  return (
    `${formatAngka(aktif)} desa aktif, ${formatAngka(ujiCoba)} uji coba, ${formatAngka(persiapan)} dalam persiapan, ` +
    `dan ${formatAngka(ditangguhkan)} ditangguhkan. ${kabupaten}`
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
