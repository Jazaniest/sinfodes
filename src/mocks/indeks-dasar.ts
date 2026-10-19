import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { UkuranBulan } from '@/domain/indeks/hitung'
import { akhirBulan } from '@/domain/kabupaten/laporan'
import type { Langganan } from '@/domain/konsol/schema'
import type { Desa } from '@/domain/wilayah/schema'

/**
 * Peserta peringkat (SPEC-V0.2 §9.2, keputusan rencana 7C-1 butir 7): desa berstatus Aktif, atau kini Ditangguhkan, yang masa
 * langganannya menutup setiap hari dari `awal` sampai `akhir` ("YYYY-MM-DD", WIB). Desa Uji coba dan Persiapan tidak pernah
 * ikut. Desa Ditangguhkan ikut di periode lama ketika masih berlangganan, jadi hasil periode itu tidak berubah.
 */
export function aktifSepanjang(desa: Desa, langganan: Langganan | undefined, awal: string, akhir: string): boolean {
  if (desa.status !== 'Aktif' && desa.status !== 'Ditangguhkan') return false
  if (!langganan || langganan.mulai === null) return false
  return langganan.mulai <= awal && (langganan.sampai === null || langganan.sampai >= akhir)
}

/** Bulan paling awal yang punya jejak: Januari dua tahun sebelum tahun `sekarang` (keputusan rencana 7C-1 butir 9). */
export const bulanAwalIndeks = (sekarang: Date): string => `${Number(tanggalIsoWib(sekarang).slice(0, 4)) - 2}-01`

/** Banyak hari Senin pada `bulan` sampai `batasTanggal` ("YYYY-MM-DD", sudah termasuk). Satuan minggu Website Teraktif. */
export function jumlahSenin(bulan: string, batasTanggal: string): number {
  return hariSenin(bulan, batasTanggal).length
}

/** Tanggal ("YYYY-MM-DD") semua hari Senin pada `bulan`, sampai `batasTanggal`. */
export function hariSenin(bulan: string, batasTanggal: string): string[] {
  const hasil: string[] = []
  const terakhir = Math.min(Number(akhirBulan(bulan).slice(8, 10)), batasTanggal.startsWith(bulan) ? Number(batasTanggal.slice(8, 10)) : batasTanggal > bulan ? 31 : 0)
  for (let h = 1; h <= terakhir; h++) {
    const tanggal = `${bulan}-${String(h).padStart(2, '0')}`
    if (new Date(`${tanggal}T00:00:00Z`).getUTCDay() === 1) hasil.push(tanggal)
  }
  return hasil
}

export const BARIS_KOSONG: Omit<UkuranBulan, 'aktif'> = {
  layanan: { selesai: 0, medianJam: null },
  responsif: { pengaduan: 0, dibalas: 0, dibalas72: 0, medianBalasJam: null },
  data: { diimpor: false, kelengkapan: null, mutasi: 0, mutasiTepat: 0 },
  transparan: { punyaApbdes: false, apbdesTerbit: false, realisasiBaru: false, kegiatanBerjalan: 0, kegiatanBerkabar: 0 },
  digital: { masuk: 0, mandiri: 0 },
  website: { tayang: false, minggu: 0, mingguAktif: 0 },
  serapan: null,
}
