import { HARGA_TRIWULAN, PAKET, type Paket } from './filter'

export type RincianPaket = {
  modul: string
  akun: string
  penyimpanan: string
  bantuan: string
  pelatihan: string
  impor: string
  hargaTahunan: number
  hargaTriwulan: number
}

const BEDA: Readonly<Record<Paket, Omit<RincianPaket, 'modul' | 'hargaTahunan' | 'hargaTriwulan'>>> = {
  Dasar: { akun: '5', penyimpanan: '2 GB', bantuan: 'WhatsApp, jam kerja', pelatihan: 'Panduan tertulis', impor: 'Dikerjakan desa' },
  Lengkap: { akun: 'Tanpa batas', penyimpanan: '10 GB', bantuan: 'Prioritas', pelatihan: 'Pelatihan daring', impor: 'Dibantu tim Sinfodes' },
}

/** Isi tabel Paket dan harga (SPEC-V0.2 §18): semua modul di kedua paket; yang berbeda hanya kapasitas dan dukungan. */
export const RINCIAN_PAKET: Readonly<Record<Paket, RincianPaket>> = Object.fromEntries(
  PAKET.map((p) => [p, { modul: 'Semua modul', ...BEDA[p], hargaTahunan: 4 * HARGA_TRIWULAN[p], hargaTriwulan: HARGA_TRIWULAN[p] }]),
) as Record<Paket, RincianPaket>
