import { z } from 'zod'
import { formatAngka } from '../format/angka'
import type { SelCsv } from '../format/csv'

/** Tenggat laporan Dana Desa (SPEC-V0.2 §8.3 butir 4): pengingat tampil di panel desa pada H-14, H-7, dan H-1. */
export const AMBANG_PENGINGAT = [14, 7, 1] as const

const tanggal = z.iso.date()
const jumlah = z.number().int().min(0)

/** POST dan PATCH /kabupaten/tenggat (Admin saja). */
export const isianTenggatSchema = z.object({
  nama: z.string().trim().min(1, 'Nama laporan wajib diisi').max(120, 'Paling banyak 120 karakter'),
  tanggal: z.iso.date('Tanggal tidak sah'),
})
export type IsianTenggat = z.infer<typeof isianTenggatSchema>

/** `terlambat`: dikirim setelah tenggat. `lewat`: belum dikirim dan tanggalnya sudah lewat. */
export const STATUS_KIRIM = ['dikirim', 'terlambat', 'belum', 'lewat'] as const
export type StatusKirim = (typeof STATUS_KIRIM)[number]
export const LABEL_STATUS_KIRIM: Readonly<Record<StatusKirim, string>> = {
  dikirim: 'Sudah dikirim',
  terlambat: 'Dikirim terlambat',
  belum: 'Belum dikirim',
  lewat: 'Lewat tenggat',
}

/** Status satu desa untuk satu tenggat; semua tanggal "YYYY-MM-DD" (WIB). */
export function statusKirim(tenggat: string, kirim: string | null, hariIni: string): StatusKirim {
  if (kirim !== null) return kirim > tenggat ? 'terlambat' : 'dikirim'
  return hariIni > tenggat ? 'lewat' : 'belum'
}

const HARI_MS = 86_400_000

/** Hari kalender dari `hariIni` sampai `tanggal`; negatif setelah tenggat lewat. */
export const sisaHari = (tanggal: string, hariIni: string): number =>
  Math.round((Date.parse(`${tanggal}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / HARI_MS)

/** "hari ini", "besok", "6 hari lagi", atau "lewat 3 hari". */
export function kalimatSisa(sisa: number): string {
  if (sisa === 0) return 'hari ini'
  if (sisa === 1) return 'besok'
  return sisa > 0 ? `${formatAngka(sisa)} hari lagi` : `lewat ${formatAngka(-sisa)} hari`
}

/** "18 dari 25 desa sudah mengirim (2 terlambat)" */
export function kalimatKirim(t: { dikirim: number; sasaran: number; terlambat: number }): string {
  const dasar = `${formatAngka(t.dikirim)} dari ${formatAngka(t.sasaran)} desa sudah mengirim`
  return t.terlambat > 0 ? `${dasar} (${formatAngka(t.terlambat)} terlambat)` : dasar
}

/** Satu tenggat di dasbor kabupaten. `dikirim` menghitung yang tepat waktu dan yang terlambat. */
export const ringkasTenggatSchema = z.object({
  id: z.string(),
  nama: z.string(),
  tanggal,
  sasaran: jumlah,
  dikirim: jumlah,
  terlambat: jumlah,
})
export type RingkasTenggat = z.infer<typeof ringkasTenggatSchema>

/** GET /kabupaten/tenggat. Tenggat hari ini masih "akan datang". */
export const daftarTenggatSchema = z.object({ akanDatang: z.array(ringkasTenggatSchema), sudahLewat: z.array(ringkasTenggatSchema) })
export type DaftarTenggat = z.infer<typeof daftarTenggatSchema>

/** Status satu desa sasaran. Strict: kabupaten hanya menerima status dan tanggal kirim, bukan siapa yang menandai. */
export const desaTenggatSchema = z.strictObject({
  id: z.string(),
  nama: z.string(),
  kecamatan: z.string(),
  status: z.enum(STATUS_KIRIM),
  tanggalKirim: tanggal.nullable(),
})
export type DesaTenggat = z.infer<typeof desaTenggatSchema>

/** GET /kabupaten/tenggat/:id: desa sasaran urut kecamatan lalu nama. */
export const detailTenggatSchema = z.object({ tenggat: ringkasTenggatSchema, desa: z.array(desaTenggatSchema) })
export type DetailTenggat = z.infer<typeof detailTenggatSchema>

export const KOLOM_CSV_TENGGAT = ['Kecamatan', 'Desa', 'Status', 'Tanggal kirim'] as const

/** Isi CSV status satu tenggat: satu baris per desa sasaran. */
export function barisCsvTenggat(d: DetailTenggat): SelCsv[][] {
  return [[...KOLOM_CSV_TENGGAT], ...d.desa.map((x): SelCsv[] => [x.kecamatan, x.nama, LABEL_STATUS_KIRIM[x.status], x.tanggalKirim])]
}

/** GET /tenggat-laporan (panel desa): tenggat kabupaten desa itu beserta tanda kirimnya sendiri; kosong bila desa bukan sasaran. */
export const tenggatDesaSchema = z.object({
  kabupaten: z.string().nullable(),
  data: z.array(
    z.object({ id: z.string(), nama: z.string(), tanggal, dikirim: z.object({ tanggal, olehNama: z.string() }).nullable() }),
  ),
})
export type TenggatDesa = z.infer<typeof tenggatDesaSchema>
export type ButirTenggatDesa = TenggatDesa['data'][number]

/** POST /tenggat-laporan/:id/kirim. */
export const tandaiDikirimSchema = z.object({ tanggal: z.iso.date('Tanggal tidak sah') })

/** Pengingat di Beranda desa: tenggat yang belum dikirim, mulai H-14. */
export const pengingatTenggatSchema = z.object({ id: z.string(), nama: z.string(), tanggal, sisaHari: z.number().int(), kabupaten: z.string() })
export type PengingatTenggat = z.infer<typeof pengingatTenggatSchema>

const geser = (iso: string, hari: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)

/**
 * Ambang pengingat yang sudah tercapai pada `hariIni`, dari H-14 ke H-1. Tanggal efektif sebuah ambang tidak lebih awal dari
 * tanggal tenggat dibuat; ambang yang tanggal efektifnya sama digabung menjadi satu (ambang terkecil), supaya tenggat yang
 * dibuat pada H-5 tidak langsung mengirim dua pengingat.
 */
export function ambangTercapai(t: { tanggal: string; dibuatPada: string }, hariIni: string): { ambang: number; tanggal: string }[] {
  const dibuat = t.dibuatPada.slice(0, 10)
  const hasil: { ambang: number; tanggal: string }[] = []
  for (const ambang of AMBANG_PENGINGAT) {
    const jatuh = geser(t.tanggal, -ambang)
    if (hariIni < jatuh) continue
    const efektif = jatuh > dibuat ? jatuh : dibuat
    const sama = hasil.findIndex((h) => h.tanggal === efektif)
    if (sama >= 0) hasil.splice(sama, 1)
    hasil.push({ ambang, tanggal: efektif })
  }
  return hasil
}
