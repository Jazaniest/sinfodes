import { z } from 'zod'
import { mutasiSchema, pelakuSchema } from '../mutasi/schema'
import { pendudukSchema } from '../penduduk/schema'
import { isiLembarSchema } from './isi-lembar'
import { jenisSuratSchema } from './jenis'
import { MODE_TANDA_TANGAN, pengaturanSuratSchema } from './pengaturan'
import { tataLetakSuratSchema } from './tata-letak'
import { POLA_KODE_VERIFIKASI } from './verifikasi'

export const STATUS_PERMOHONAN = ['menunggu', 'diproses', 'perlu-ttd', 'selesai', 'ditolak', 'dibatalkan'] as const
export type StatusPermohonan = (typeof STATUS_PERMOHONAN)[number]
export const LABEL_STATUS: Readonly<Record<StatusPermohonan, string>> = {
  menunggu: 'Menunggu',
  diproses: 'Diproses',
  'perlu-ttd': 'Perlu TTD',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
}
/** Status yang masih perlu dikerjakan: selalu tampil, tidak dibatasi periode. */
export const STATUS_TERBUKA: readonly StatusPermohonan[] = ['menunggu', 'diproses', 'perlu-ttd']

export const KANAL = ['online', 'loket'] as const
export type Kanal = (typeof KANAL)[number]
export const LABEL_KANAL: Readonly<Record<Kanal, string>> = { online: 'Online', loket: 'Loket' }

export const TAHAP_TTD = ['paraf', 'tanda-tangan'] as const
export type TahapTtd = (typeof TAHAP_TTD)[number]

/** Aksi status (SPEC §7.1); urutannya juga urutan tombol. */
export const AKSI_SURAT = [
  'proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan', 'tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa',
] as const
export type AksiSurat = (typeof AKSI_SURAT)[number]
/** Kejadian di riwayat permohonan: aksi status, ditambah saat masuk dan saat isian disimpan. */
export const KEJADIAN_SURAT = ['diajukan', 'dibuat', 'disimpan', ...AKSI_SURAT] as const
export type KejadianSurat = (typeof KEJADIAN_SURAT)[number]

const waktu = z.iso.datetime({ offset: true })
const catatanPetugas = z.object({ oleh: pelakuSchema, pada: waktu, catatan: z.string().min(1) })

/** Satu baris riwayat permohonan: siapa, kapan, dan catatannya (SPEC §7.1). */
export const entriRiwayatSuratSchema = z.object({
  id: z.string(),
  kejadian: z.enum(KEJADIAN_SURAT),
  waktu,
  oleh: pelakuSchema,
  catatan: z.string().nullable(),
})
export type EntriRiwayatSurat = z.infer<typeof entriRiwayatSuratSchema>

/** Berkas persyaratan yang diunggah warga (SPEC §7.4). Demo hanya menyimpan nama dan ukurannya. */
export const lampiranSchema = z.object({
  id: z.string(),
  syarat: z.string().min(1),
  berkas: z.string().min(1),
  ukuranKb: z.number().int().min(1),
})
export type Lampiran = z.infer<typeof lampiranSchema>

/** Diisi saat ditandatangani (SPEC §7.2, §7.5). */
export const terbitSchema = z.object({
  nomor: z.string().min(1),
  tahun: z.number().int(),
  urut: z.number().int().min(1),
  kodeVerifikasi: z.string().regex(POLA_KODE_VERIFIKASI),
  pada: waktu,
  /** `nip` dibekukan bersama penanda tangan, untuk blok tanda tangan bila tata letaknya menampilkan NIP (SPEC-V0.2 12.2). */
  penandatangan: z.object({ id: z.string(), nama: z.string(), peran: z.enum(['kades', 'sekdes']), nip: z.string().nullable() }),
  mode: z.enum(MODE_TANDA_TANGAN),
  berlakuSampai: z.iso.date().nullable(),
  /** Isi surat dibekukan saat ditandatangani: perubahan data penduduk sesudahnya tidak mengubah surat yang terbit. */
  lembar: isiLembarSchema,
  /** Tata letak yang berlaku saat tanda tangan, dibekukan: mengganti tata letak desa tidak mengubah surat yang sudah terbit (SPEC-V0.2 12.2). */
  tataLetak: tataLetakSuratSchema,
  /**
   * Lambang yang terpasang saat tanda tangan, dibekukan sebagai data URL (null bila memakai lambang tiruan). Di demo
   * string yang sama dipakai bersama; di server nyata disimpan sebagai rujukan versi lambang.
   */
  kop: z.object({ lambang: z.string().nullable(), lambangKabupaten: z.string().nullable() }),
})
export type Terbit = z.infer<typeof terbitSchema>

/** Permohonan surat (SPEC §7.1). `dusunId` mengikuti pemohon, untuk membatasi Kepala Dusun. */
export const permohonanSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  dusunId: z.string(),
  /** Nomor urut permohonan per tahun masuk (kolom "No. urut"). */
  noUrut: z.number().int().min(1),
  jenisId: z.string(),
  kanal: z.enum(KANAL),
  pemohonId: z.string(),
  /** Orang yang diterangkan bila bukan pemohon: bayi (kelahiran) atau almarhum (kematian). */
  subjekId: z.string().nullable(),
  mutasiId: z.string().nullable(),
  isian: z.record(z.string(), z.string()),
  status: z.enum(STATUS_PERMOHONAN),
  /** Hanya untuk Perlu TTD. */
  tahap: z.enum(TAHAP_TTD).nullable(),
  /** Diisi saat Kades/Sekdes mengembalikan; hilang saat diajukan lagi. */
  dikembalikan: catatanPetugas.nullable(),
  penolakan: catatanPetugas.nullable(),
  pembatalan: catatanPetugas.nullable(),
  diambil: z.object({ pada: waktu, oleh: pelakuSchema }).nullable(),
  masukPada: waktu,
  /** Waktu selesai ditandatangani atau ditolak. */
  ditutupPada: waktu.nullable(),
  lampiran: z.array(lampiranSchema),
  catatanInternal: z.string().nullable(),
  riwayat: z.array(entriRiwayatSuratSchema),
  terbit: terbitSchema.nullable(),
})
export type Permohonan = z.infer<typeof permohonanSchema>

/** Baris daftar Permohonan (SPEC §7.4 layar 1). */
export const barisPermohonanSchema = z.object({
  id: z.string(),
  noUrut: z.number().int().min(1),
  status: z.enum(STATUS_PERMOHONAN),
  tahap: z.enum(TAHAP_TTD).nullable(),
  dikembalikan: z.boolean(),
  kanal: z.enum(KANAL),
  masukPada: waktu,
  ditutupPada: waktu.nullable(),
  jenis: z.object({ id: z.string(), kode: z.string(), nama: z.string() }),
  pemohon: z.object({ id: z.string(), nama: z.string(), nik: z.string().nullable() }),
  nomor: z.string().nullable(),
})
export type BarisPermohonan = z.infer<typeof barisPermohonanSchema>

export const PERIODE_PERMOHONAN = [14, 30, 90, 365] as const
export type PeriodePermohonan = (typeof PERIODE_PERMOHONAN)[number]
export const LABEL_PERIODE: Readonly<Record<PeriodePermohonan, string>> = {
  14: '14 hari terakhir',
  30: '30 hari terakhir',
  90: '3 bulan terakhir',
  365: '12 bulan terakhir',
}

const kodeJenis = z.string().regex(/^[A-Z]{2,5}$/)

/** Filter daftar Permohonan di URL (SPEC §7.4). Periode hanya berlaku untuk status yang sudah ditutup. */
export const filterPermohonanSchema = z.object({
  status: z.enum(STATUS_PERMOHONAN).default('menunggu'),
  periode: z.coerce
    .number()
    .pipe(z.union([z.literal(14), z.literal(30), z.literal(90), z.literal(365)]))
    .default(14),
  jenis: kodeJenis.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type FilterPermohonan = z.infer<typeof filterPermohonanSchema>

/** Jumlah per status untuk tab, dan angka menu untuk peran aktif. */
export const jumlahPermohonanSchema = z.object({
  status: z.record(z.enum(STATUS_PERMOHONAN), z.number().int().min(0)),
  perluTindakan: z.number().int().min(0),
})
export type JumlahPermohonan = z.infer<typeof jumlahPermohonanSchema>

/** Pejabat yang menjabat; `nipKades` mengisi NIP di blok tanda tangan draf bila tata letaknya menampilkan NIP. */
export const pejabatSchema = z.object({ kades: z.string(), sekdes: z.string(), nipKades: z.string().nullable().optional() })

/** GET /permohonan/:id dan hasil setiap aksi: semua yang dibutuhkan ruang kerja dan lembar surat. */
export const detailPermohonanSchema = z.object({
  permohonan: permohonanSchema,
  jenis: jenisSuratSchema,
  pemohon: pendudukSchema,
  subjek: pendudukSchema.nullable(),
  mutasi: mutasiSchema.nullable(),
  pengaturan: pengaturanSuratSchema,
  /** Nama pejabat penandatangan saat ini, untuk blok tanda tangan draf. */
  pejabat: pejabatSchema,
})
export type DetailPermohonan = z.infer<typeof detailPermohonanSchema>

const teksWajib = (pesan: string) => z.string().trim().min(1, pesan).max(500, 'Paling banyak 500 karakter')
const isianSchema = z.record(z.string(), z.string().max(500))

export const PESAN_CATATAN_NIK = 'Jangan menulis NIK atau nomor 16 angka di catatan.'
/** Harus sama persis dengan CHECK `permohonan` di migrasi 0012: 16 angka berurutan yang tidak bersambung angka lain. */
const POLA_NIK_DI_CATATAN = /(?<!\d)\d{16}(?!\d)/
export const tanpaNik = (teks: string) => !POLA_NIK_DI_CATATAN.test(teks)

export const alasanSchema = z.object({ alasan: teksWajib('Alasan wajib diisi').refine(tanpaNik, PESAN_CATATAN_NIK) })
export const catatanKembaliSchema = z.object({
  catatan: teksWajib('Catatan wajib diisi').refine(tanpaNik, PESAN_CATATAN_NIK),
})
export const tandaTanganSchema = z.object({ passphrase: z.string().min(1, 'Passphrase wajib diisi') })
export const ajukanTtdSchema = z.object({ isian: isianSchema.optional() })
export const ubahPermohonanSchema = z.object({
  isian: isianSchema.optional(),
  catatanInternal: z.string().trim().max(1000).refine(tanpaNik, PESAN_CATATAN_NIK).nullable().optional(),
})
export const cariPermohonanSchema = z.object({ kata: z.string().trim().min(1).max(100), jenis: kodeJenis.nullable() })

/** POST /permohonan dari loket (SPEC §7.4 layar 2). `ajukan` langsung mengajukan tanda tangan; selain itu Simpan draf. */
export const buatPermohonanSchema = z.object({
  jenisId: z.string().min(1),
  pemohonId: z.string().min(1),
  subjekId: z.string().nullable(),
  mutasiId: z.string().nullable(),
  isian: isianSchema,
  ajukan: z.boolean(),
})
export type BuatPermohonan = z.infer<typeof buatPermohonanSchema>

/**
 * GET /permohonan/saran: bahan surat baru di loket. Isian awal dari mutasi yang baru dicatat (beserta mutasinya),
 * ditambah pengaturan surat desa dan nama pejabat untuk pratinjau lembar.
 */
export const saranSuratSchema = z.object({
  mutasi: mutasiSchema.nullable(),
  pemohonId: z.string().nullable(),
  isian: z.record(z.string(), z.string()),
  pengaturan: pengaturanSuratSchema,
  pejabat: pejabatSchema,
})
export type SaranSurat = z.infer<typeof saranSuratSchema>
