import { susunBukuAgenda, type BahanBukuAgenda } from '@sinfodes/kontrak/buku/agenda'
import { susunBukuPenduduk, type BahanBukuPenduduk, type IsiSusunan, type KodeBukuPenduduk } from '@sinfodes/kontrak/buku/penduduk'
import type { KodeBuku } from '@sinfodes/kontrak/buku/schema'

/** Tahap yang menyediakan sumber data buku yang belum ada di server. */
export type TahapPenunggu = '8G'

/**
 * Cara menyusun satu buku beserta jenis bahannya: bahan penduduk (semua penduduk dibuka dari sandi) atau bahan surat (dua kueri
 * sempit tanpa sandi). Layanan hanya membaca bahan yang dibutuhkan buku yang sedang dibuka.
 */
export type SusunanBuku =
  | { bahan: 'penduduk'; susun: (bahan: BahanBukuPenduduk) => IsiSusunan }
  | { bahan: 'agenda'; susun: (bahan: BahanBukuAgenda) => IsiSusunan }

const penduduk = (kode: KodeBukuPenduduk): SusunanBuku => ({ bahan: 'penduduk', susun: (bahan) => susunBukuPenduduk(kode, bahan) })

/** Buku yang sumber datanya sudah ada di server: lima buku penduduk dan Agenda. Tahap berikutnya menambahkan bukunya di sini. */
export const SUSUNAN_BUKU: Readonly<Partial<Record<KodeBuku, SusunanBuku>>> = {
  'induk-penduduk': penduduk('induk-penduduk'),
  'mutasi-penduduk': penduduk('mutasi-penduduk'),
  'rekapitulasi-penduduk': penduduk('rekapitulasi-penduduk'),
  'penduduk-sementara': penduduk('penduduk-sementara'),
  'ktp-kk': penduduk('ktp-kk'),
  agenda: { bahan: 'agenda', susun: susunBukuAgenda },
}

/**
 * Buku yang punya sumber data tetapi tabelnya belum ada di server (rencana 8E3 Ruling 12). Tahap yang disebut wajib memindahkan
 * bukunya ke `SUSUNAN_BUKU`; uji meta memastikan tiap buku bersumber ada tepat di salah satu daftar.
 */
export const BUKU_MENUNGGU: Readonly<Partial<Record<KodeBuku, TahapPenunggu>>> = {
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
