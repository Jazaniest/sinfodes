import { susunBukuPenduduk, type BahanBukuPenduduk, type IsiSusunan, type KodeBukuPenduduk } from '@sinfodes/kontrak/buku/penduduk'
import type { KodeBuku } from '@sinfodes/kontrak/buku/schema'

/** Tahap yang menyediakan sumber data buku yang belum ada di server. */
export type TahapPenunggu = '8F' | '8G'

const susun = (kode: KodeBukuPenduduk) => (bahan: BahanBukuPenduduk): IsiSusunan => susunBukuPenduduk(kode, bahan)

/** Buku yang sumber datanya sudah ada di server: lima buku penduduk. Tahap berikutnya menambahkan bukunya di sini. */
export const SUSUNAN_BUKU: Readonly<Partial<Record<KodeBuku, (bahan: BahanBukuPenduduk) => IsiSusunan>>> = {
  'induk-penduduk': susun('induk-penduduk'),
  'mutasi-penduduk': susun('mutasi-penduduk'),
  'rekapitulasi-penduduk': susun('rekapitulasi-penduduk'),
  'penduduk-sementara': susun('penduduk-sementara'),
  'ktp-kk': susun('ktp-kk'),
}

/**
 * Buku yang punya sumber data tetapi tabelnya belum ada di server (rencana 8E3 Ruling 12). Tahap yang disebut wajib memindahkan
 * bukunya ke `SUSUNAN_BUKU`; uji meta memastikan tiap buku bersumber ada tepat di salah satu daftar.
 */
export const BUKU_MENUNGGU: Readonly<Partial<Record<KodeBuku, TahapPenunggu>>> = {
  agenda: '8F',
  'inventaris-kekayaan': '8G',
  'tanah-kas-desa': '8G',
  'aparat-pemerintah': '8G',
  'kader-pemberdayaan': '8G',
  'apb-desa': '8G',
  rab: '8G',
  'rencana-kerja-pembangunan': '8G',
  'kegiatan-pembangunan': '8G',
  'inventaris-hasil-pembangunan': '8G',
}
