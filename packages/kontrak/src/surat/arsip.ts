import { z } from 'zod'
import type { SelCsv } from '../format/csv'
import { formatTanggal } from '../format/tanggal'
import { pelakuSchema } from '../mutasi/schema'
import { KANAL, LABEL_KANAL, PESAN_CATATAN_NIK, tanpaNik } from './permohonan'

const bulanSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const halaman = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
}

/** Arsip disaring menurut jabatan penanda tangan: Kepala Desa, atau Sekretaris Desa atas nama Kepala Desa. */
export const PERAN_PENANDATANGAN = ['kades', 'sekdes'] as const
export type PeranPenandatangan = (typeof PERAN_PENANDATANGAN)[number]

/** Satu surat keluar: setiap surat yang pernah terbit, termasuk yang kemudian dibatalkan (SPEC §7.4 layar 5). */
export const barisSuratKeluarSchema = z.object({
  /** ID permohonan; baris membuka ruang kerja suratnya. */
  id: z.string(),
  nomor: z.string().min(1),
  urut: z.number().int().min(1),
  tanggal: z.iso.date(),
  jenis: z.object({ kode: z.string(), nama: z.string() }),
  /** Orang yang diterangkan surat: pemohon, atau bayi/almarhum. */
  untuk: z.string(),
  penandatangan: z.object({ nama: z.string(), peran: z.enum(PERAN_PENANDATANGAN) }),
  kanal: z.enum(KANAL),
  status: z.enum(['selesai', 'dibatalkan']),
})
export type BarisSuratKeluar = z.infer<typeof barisSuratKeluarSchema>

export const filterSuratKeluarSchema = z.object({
  /** Bulan terbit (YYYY-MM). Tanpa nilai berarti bulan berjalan. */
  bulan: bulanSchema.optional(),
  jenis: z.string().regex(/^[A-Z]{2,5}$/).optional(),
  penandatangan: z.enum(PERAN_PENANDATANGAN).optional(),
  ...halaman,
})
export type FilterSuratKeluar = z.infer<typeof filterSuratKeluarSchema>

export function labelPenandatangan(p: { nama: string; peran: PeranPenandatangan }): string {
  return p.peran === 'sekdes' ? `a.n. Kepala Desa, ${p.nama}` : p.nama
}

export const LABEL_STATUS_ARSIP: Readonly<Record<BarisSuratKeluar['status'], string>> = { selesai: 'Selesai', dibatalkan: 'Dibatalkan' }

/** Buku Agenda Surat Keluar (SPEC §7.4 layar 5): urut nomor, satu baris per surat. */
export function barisCsvBukuAgenda(baris: readonly BarisSuratKeluar[]): SelCsv[][] {
  return [
    ['No.', 'Nomor surat', 'Tanggal', 'Jenis surat', 'Untuk', 'Penandatangan', 'Kanal', 'Status'],
    ...baris.map((b, i) => [
      i + 1, b.nomor, formatTanggal(b.tanggal), b.jenis.nama, b.untuk, labelPenandatangan(b.penandatangan), LABEL_KANAL[b.kanal],
      LABEL_STATUS_ARSIP[b.status],
    ]),
  ]
}

/** Jabatan tujuan disposisi surat masuk. */
export const TUJUAN_DISPOSISI = [
  'Kepala Desa', 'Sekretaris Desa', 'Kaur Keuangan', 'Kaur Umum dan Perencanaan', 'Kasi Pemerintahan', 'Kasi Kesejahteraan',
  'Kasi Pelayanan', 'Kepala Dusun',
] as const
export type TujuanDisposisi = (typeof TUJUAN_DISPOSISI)[number]

/** Register surat masuk (SPEC §7.4 layar 5). Demo menyimpan nama dan ukuran berkas scan, bukan isinya. */
export const suratMasukSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  /** Nomor agenda per tahun terima. */
  noAgenda: z.number().int().min(1),
  diterima: z.iso.date(),
  nomor: z.string().min(1),
  tanggalSurat: z.iso.date(),
  pengirim: z.string().min(1),
  perihal: z.string().min(1),
  scan: z.object({ berkas: z.string().min(1), ukuranKb: z.number().int().min(1) }).nullable(),
  disposisi: z.object({ kepada: z.enum(TUJUAN_DISPOSISI), instruksi: z.string() }).nullable(),
  dicatat: z.object({ oleh: pelakuSchema, pada: z.iso.datetime({ offset: true }) }),
})
export type SuratMasuk = z.infer<typeof suratMasukSchema>

/** Isian dialog Catat surat masuk. Dikirim sebagai FormData bersama berkas scan (opsional) bernama `scan`. */
export const isianSuratMasukSchema = z
  .object({
    diterima: z.iso.date('Tanggal terima wajib diisi'),
    nomor: z.string().trim().min(1, 'Nomor surat wajib diisi').max(100, 'Nomor surat terlalu panjang').refine(tanpaNik, PESAN_CATATAN_NIK),
    tanggalSurat: z.iso.date('Tanggal surat wajib diisi'),
    pengirim: z.string().trim().min(1, 'Pengirim wajib diisi').max(150, 'Nama pengirim terlalu panjang').refine(tanpaNik, PESAN_CATATAN_NIK),
    perihal: z.string().trim().min(1, 'Perihal wajib diisi').max(300, 'Perihal terlalu panjang').refine(tanpaNik, PESAN_CATATAN_NIK),
    disposisiKepada: z.enum(TUJUAN_DISPOSISI).nullable(),
    disposisiInstruksi: z.string().trim().max(500, 'Instruksi terlalu panjang').refine(tanpaNik, PESAN_CATATAN_NIK),
  })
  .refine((x) => x.tanggalSurat <= x.diterima, { path: ['tanggalSurat'], message: 'Tanggal surat tidak boleh sesudah tanggal terima' })
  .refine((x) => x.disposisiKepada !== null || x.disposisiInstruksi === '', {
    path: ['disposisiKepada'],
    message: 'Pilih tujuan disposisi untuk instruksi ini',
  })
export type IsianSuratMasuk = z.infer<typeof isianSuratMasukSchema>

export const filterSuratMasukSchema = z.object({
  /** Bulan terima (YYYY-MM). Tanpa nilai berarti bulan berjalan. */
  bulan: bulanSchema.optional(),
  ...halaman,
})
export type FilterSuratMasuk = z.infer<typeof filterSuratMasukSchema>

export const BERKAS_SCAN = ['.pdf', '.jpg', '.jpeg', '.png'] as const
export const MAKS_SCAN_MB = 5

const MAKS_NAMA_SCAN = 100

/**
 * Nama pindaian yang aman disimpan dan ditampilkan: tanpa jalur folder, karakter kontrol atau pengarah teks, titik di awal,
 * dan 16 angka berurutan (dugaan NIK). Paling banyak 100 karakter dengan ekstensi tetap; nama yang habis menjadi `scan`.
 */
export function namaScanAman(nama: string): string {
  const berkas = (nama.split(/[\\/]/).pop() ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim()
  const ekstensi = /\.[A-Za-z0-9]{1,8}$/.exec(berkas)?.[0] ?? ''
  const batang = berkas.slice(0, berkas.length - ekstensi.length).replace(/^\.+/, '').trim()
  const dipotong = [...batang].slice(0, MAKS_NAMA_SCAN - ekstensi.length).join('').trim()
  return dipotong === '' || !tanpaNik(dipotong) ? `scan${ekstensi}` : `${dipotong}${ekstensi}`
}
