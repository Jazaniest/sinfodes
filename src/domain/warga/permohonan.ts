import { z } from 'zod'
import { jenisSuratSchema } from '../surat/jenis'
import { pengaturanSuratSchema, type ModeTandaTangan } from '../surat/pengaturan'
import {
  entriRiwayatSuratSchema, STATUS_PERMOHONAN, STATUS_TERBUKA, TAHAP_TTD, terbitSchema,
  type EntriRiwayatSurat, type KejadianSurat, type Permohonan,
} from '../surat/permohonan'

const waktu = z.iso.datetime({ offset: true })

/** Satu permohonan di Beranda dan Riwayat warga (SPEC §10). */
export const ringkasPermohonanWargaSchema = z.object({
  id: z.string(),
  status: z.enum(STATUS_PERMOHONAN),
  tahap: z.enum(TAHAP_TTD).nullable(),
  dikembalikan: z.boolean(),
  masukPada: waktu,
  ditutupPada: waktu.nullable(),
  jenis: z.object({ kode: z.string(), nama: z.string() }),
  /** Orang yang diterangkan surat: pemohon, atau subjeknya (bayi pada surat kelahiran). */
  untuk: z.object({ id: z.string(), nama: z.string() }),
  posisi: z.string(),
  nomor: z.string().nullable(),
  /** Nomor tiket untuk ditanyakan ke kantor desa, mis. "2026-0581". */
  tiket: z.string(),
})
export type RingkasPermohonanWarga = z.infer<typeof ringkasPermohonanWargaSchema>

/** GET /warga/permohonan/:id. Lembar surat hanya dikirim bila sudah Selesai. */
export const detailPermohonanWargaSchema = z.object({
  permohonan: ringkasPermohonanWargaSchema.extend({
    isian: z.record(z.string(), z.string()),
    riwayat: z.array(entriRiwayatSuratSchema),
    alasanDitolak: z.string().nullable(),
    diambilPada: waktu.nullable(),
  }),
  jenis: jenisSuratSchema.pick({ kode: true, nama: true, isian: true }),
  terbit: terbitSchema.nullable(),
  pengaturan: pengaturanSuratSchema.pick({ kertas: true, huruf: true }),
})
export type DetailPermohonanWarga = z.infer<typeof detailPermohonanWargaSchema>

export type KeadaanPosisi = Pick<Permohonan, 'status' | 'tahap'> & {
  dikembalikan: boolean
  diambil: boolean
  /** Cara surat ditandatangani; null selama belum terbit. */
  mode: ModeTandaTangan | null
}

/** Posisi permohonan dalam kata sederhana, mis. "menunggu tanda tangan Kepala Desa" (SPEC §10). */
export function posisiPermohonan(p: KeadaanPosisi): string {
  if (p.status === 'menunggu') return 'menunggu diperiksa petugas desa'
  if (p.status === 'diproses') return p.dikembalikan ? 'sedang diperbaiki petugas desa' : 'sedang diproses petugas desa'
  if (p.status === 'perlu-ttd') return p.tahap === 'paraf' ? 'menunggu paraf Sekretaris Desa' : 'menunggu tanda tangan Kepala Desa'
  if (p.status === 'selesai') {
    if (p.diambil) return 'selesai, sudah diambil'
    return p.mode === 'tte' ? 'selesai, surat bisa diunduh' : 'selesai, ambil di kantor desa'
  }
  return p.status === 'ditolak' ? 'ditolak' : 'dibatalkan'
}

/** "menunggu …" → "Menunggu …". */
export const kalimat = (teks: string): string => teks.charAt(0).toUpperCase() + teks.slice(1)

/** "Surat Keterangan Tidak Mampu (SKTM)": nama jenis surat selalu lengkap (SPEC §10). */
export const namaJenisLengkap = (j: { nama: string; kode: string }): string => `${j.nama} (${j.kode})`

/** Permohonan milik warga: dia pemohonnya, atau dia yang mengajukan lewat layanan warga (fokus review 3). */
export function milikWarga(p: Pick<Permohonan, 'pemohonId' | 'riwayat'>, pendudukId: string): boolean {
  return p.pemohonId === pendudukId || p.riwayat.some((e) => e.kejadian === 'diajukan' && e.oleh.id === pendudukId)
}

/** Catatan yang memang ditujukan ke warga. Catatan pengembalian antarpetugas tidak dikirim (fokus review 3). */
const CATATAN_UNTUK_WARGA: readonly KejadianSurat[] = ['tolak', 'batalkan']

export function riwayatUntukWarga(riwayat: readonly EntriRiwayatSurat[]): EntriRiwayatSurat[] {
  return riwayat.map((e) => (CATATAN_UNTUK_WARGA.includes(e.kejadian) ? e : { ...e, catatan: null }))
}

const HARI_MS = 86_400_000

/** Beranda: permohonan yang masih berjalan, ditambah yang Selesai 14 hari terakhir dan belum diambil. */
export function tampilDiBeranda(p: Pick<Permohonan, 'status' | 'ditutupPada' | 'diambil'>, sekarang: Date): boolean {
  if (STATUS_TERBUKA.includes(p.status)) return true
  if (p.status !== 'selesai' || p.diambil !== null || p.ditutupPada === null) return false
  return new Date(p.ditutupPada).getTime() >= sekarang.getTime() - 14 * HARI_MS
}
