import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { UkuranBulan } from '@/domain/indeks/hitung'
import { akhirBulan } from '@/domain/kabupaten/laporan'
import type { Langganan } from '@/domain/konsol/schema'
import type { Desa } from '@/domain/wilayah/schema'
import type { RiwayatStatusDesa } from './tipe-db'

/**
 * Peserta peringkat (SPEC-V0.2 §9.2, keputusan rencana 7C-1 butir 7): desa berstatus Aktif, atau kini Ditangguhkan, yang masa
 * langganannya menutup setiap hari dari `awal` sampai `akhir` ("YYYY-MM-DD", WIB). Desa Uji coba dan Persiapan tidak pernah
 * ikut. Desa Ditangguhkan ikut di periode lama ketika masih berlangganan, jadi hasil periode itu tidak berubah.
 */
export function aktifSepanjang(
  desa: Desa,
  langganan: Langganan | undefined,
  awal: string,
  akhir: string,
  riwayatStatus: readonly Pick<RiwayatStatusDesa, 'ke' | 'pada'>[] = [],
): boolean {
  if (desa.status !== 'Aktif' && desa.status !== 'Ditangguhkan') return false
  if (!langganan || langganan.mulai === null) return false
  if (tangguhBeririsan(riwayatStatus, awal, akhir)) return false
  return langganan.mulai <= awal && (langganan.sampai === null || langganan.sampai >= akhir)
}

/**
 * Apakah masa tangguh desa beririsan dengan rentang `awal`-`akhir` (rencana 7D-2 keputusan 9)? Masa tangguh dimulai pada hari
 * entri `ke: 'Ditangguhkan'` dan berakhir sebelum hari entri `ke: 'Aktif'` berikutnya (hari dicabut sudah aktif), atau belum
 * berakhir. Desa yang pernah ditangguhkan di tengah periode bukan peserta periode itu, tetapi peserta lagi di periode berikutnya.
 */
export function tangguhBeririsan(riwayatStatus: readonly Pick<RiwayatStatusDesa, 'ke' | 'pada'>[], awal: string, akhir: string): boolean {
  const urut = [...riwayatStatus].sort((a, b) => a.pada.localeCompare(b.pada))
  let mulai: string | null = null
  for (const r of urut) {
    const hari = r.pada.slice(0, 10)
    if (r.ke === 'Ditangguhkan' && mulai === null) mulai = hari
    else if (r.ke === 'Aktif' && mulai !== null) {
      if (mulai <= akhir && hari > awal) return true
      mulai = null
    }
  }
  return mulai !== null && mulai <= akhir
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
