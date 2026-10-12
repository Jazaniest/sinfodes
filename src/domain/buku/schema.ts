import { z } from 'zod'
import { metaSchema } from '../api'
import { boleh } from '../pengguna/hak-akses'
import type { Peran } from '../pengguna/schema'

export const KELOMPOK_BUKU = ['umum', 'penduduk', 'keuangan', 'pembangunan'] as const
export type KelompokBuku = (typeof KELOMPOK_BUKU)[number]
export const LABEL_KELOMPOK_BUKU: Readonly<Record<KelompokBuku, string>> = {
  umum: 'Administrasi umum',
  penduduk: 'Administrasi penduduk',
  keuangan: 'Administrasi keuangan',
  pembangunan: 'Administrasi pembangunan',
}

type DefinisiBuku = { kode: string; nama: string; kelompok: KelompokBuku; sumber: string | null }

/** SPEC Lampiran B: buku wajib Permendagri 47/2016 dan sumbernya di Sinfodes. `sumber` null berarti diisi manual. */
export const DAFTAR_BUKU = [
  { kode: 'peraturan-desa', nama: 'Buku Peraturan di Desa', kelompok: 'umum', sumber: null },
  { kode: 'keputusan-kepala-desa', nama: 'Buku Keputusan Kepala Desa', kelompok: 'umum', sumber: null },
  { kode: 'inventaris-kekayaan', nama: 'Buku Inventaris dan Kekayaan Desa', kelompok: 'umum', sumber: 'Aset Desa' },
  { kode: 'aparat-pemerintah', nama: 'Buku Aparat Pemerintah Desa', kelompok: 'umum', sumber: 'Lembaga Desa' },
  { kode: 'tanah-kas-desa', nama: 'Buku Tanah Kas Desa', kelompok: 'umum', sumber: 'Aset Desa (kategori tanah)' },
  { kode: 'tanah-di-desa', nama: 'Buku Tanah di Desa', kelompok: 'umum', sumber: null },
  { kode: 'agenda', nama: 'Buku Agenda', kelompok: 'umum', sumber: 'Layanan Surat (surat keluar dan masuk)' },
  { kode: 'ekspedisi', nama: 'Buku Ekspedisi', kelompok: 'umum', sumber: null },
  { kode: 'lembaran-berita-desa', nama: 'Buku Lembaran Desa dan Berita Desa', kelompok: 'umum', sumber: null },
  { kode: 'induk-penduduk', nama: 'Buku Induk Penduduk', kelompok: 'penduduk', sumber: 'Kependudukan' },
  { kode: 'mutasi-penduduk', nama: 'Buku Mutasi Penduduk Desa', kelompok: 'penduduk', sumber: 'Mutasi' },
  { kode: 'rekapitulasi-penduduk', nama: 'Buku Rekapitulasi Jumlah Penduduk', kelompok: 'penduduk', sumber: 'Statistik' },
  { kode: 'penduduk-sementara', nama: 'Buku Penduduk Sementara', kelompok: 'penduduk', sumber: 'Kependudukan (status Sementara)' },
  { kode: 'ktp-kk', nama: 'Buku KTP dan Kartu Keluarga', kelompok: 'penduduk', sumber: 'Kependudukan dan Keluarga' },
  { kode: 'apb-desa', nama: 'Buku APB Desa', kelompok: 'keuangan', sumber: 'Keuangan' },
  { kode: 'rab', nama: 'Buku Rencana Anggaran Biaya', kelompok: 'keuangan', sumber: 'Pembangunan' },
  { kode: 'kas-pembantu-kegiatan', nama: 'Buku Kas Pembantu Kegiatan', kelompok: 'keuangan', sumber: null },
  { kode: 'kas-umum', nama: 'Buku Kas Umum', kelompok: 'keuangan', sumber: null },
  { kode: 'kas-pembantu', nama: 'Buku Kas Pembantu', kelompok: 'keuangan', sumber: null },
  { kode: 'bank-desa', nama: 'Buku Bank Desa', kelompok: 'keuangan', sumber: null },
  { kode: 'rencana-kerja-pembangunan', nama: 'Buku Rencana Kerja Pembangunan', kelompok: 'pembangunan', sumber: 'Pembangunan' },
  { kode: 'kegiatan-pembangunan', nama: 'Buku Kegiatan Pembangunan', kelompok: 'pembangunan', sumber: 'Pembangunan' },
  {
    kode: 'inventaris-hasil-pembangunan', nama: 'Buku Inventaris Hasil-hasil Pembangunan', kelompok: 'pembangunan',
    sumber: 'Pembangunan (status Selesai)',
  },
  { kode: 'kader-pemberdayaan', nama: 'Buku Kader Pemberdayaan Masyarakat', kelompok: 'pembangunan', sumber: 'Lembaga Desa' },
] as const satisfies readonly DefinisiBuku[]
export type KodeBuku = (typeof DAFTAR_BUKU)[number]['kode']

export function cariBuku(kode: string): DefinisiBuku | undefined {
  return (DAFTAR_BUKU as readonly DefinisiBuku[]).find((b) => b.kode === kode)
}

/** Kaur Keuangan hanya melihat buku keuangan (SPEC §5.1); peran lain mengikuti kemampuan `buku.lihat`. */
export function bukuBoleh(peran: Peran, kelompok: KelompokBuku): boolean {
  if (!boleh(peran, 'buku.lihat')) return false
  return peran !== 'kaur-keuangan' || kelompok === 'keuangan'
}

/** Satu buku di daftar. `jumlah` dan `diperbarui` null untuk buku yang diisi manual. */
export const ringkasBukuSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  kelompok: z.enum(KELOMPOK_BUKU),
  sumber: z.string().nullable(),
  jumlah: z.number().int().min(0).nullable(),
  diperbarui: z.iso.datetime({ offset: true }).nullable(),
})
export type RingkasBuku = z.infer<typeof ringkasBukuSchema>

/** GET /buku-administrasi/:kode: kolom format buku dan baris satu halaman, semuanya teks siap cetak. */
export const isiBukuSchema = z.object({
  buku: ringkasBukuSchema,
  kolom: z.array(z.string()).min(1),
  baris: z.array(z.array(z.string())),
  meta: metaSchema,
})
export type IsiBuku = z.infer<typeof isiBukuSchema>

/** Unduh dan Cetak mengambil semua baris sekaligus. */
export const UKURAN_SEMUA_BARIS = 5000
export const filterIsiBukuSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(UKURAN_SEMUA_BARIS).default(25),
})
