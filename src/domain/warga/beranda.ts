import { z } from 'zod'
import { STATUS_PENYALURAN, tahapBansosSchema } from '../bansos/schema'
import { pengumumanSchema } from '../website/schema'
import { ringkasPermohonanWargaSchema } from './permohonan'

/** GET /warga/beranda (SPEC §10). */
export const berandaWargaSchema = z.object({
  /** Yang masih berjalan, ditambah yang baru Selesai dan belum diambil. */
  permohonan: z.array(ringkasPermohonanWargaSchema),
  /** Pengumuman yang berlaku hari ini, terbaru dulu, paling banyak 3. */
  pengumuman: z.array(pengumumanSchema),
  /** Hanya bila keluarganya punya balita. */
  posyandu: z
    .object({
      nama: z.string(),
      tempat: z.string(),
      jadwal: z.iso.date(),
      balita: z.array(z.object({ id: z.string(), nama: z.string(), umurBulan: z.number().int().min(0).max(59) })).min(1),
    })
    .nullable(),
  bantuan: z.array(
    z.object({
      id: z.string(),
      program: z.string(),
      bentuk: z.string(),
      /** Tahap terakhir yang sudah diproses (tersalur, belum diambil, atau ditahan). */
      terakhir: z.object({ ke: z.number().int().min(1), periode: z.string(), status: z.enum(STATUS_PENYALURAN) }).nullable(),
      /** Tahap berikut yang dijadwalkan mulai hari ini. */
      berikut: tahapBansosSchema.nullable(),
    }),
  ),
})
export type BerandaWarga = z.infer<typeof berandaWargaSchema>

/** 34 → "2 tahun 10 bulan". */
export function teksUmurBalita(umurBulan: number): string {
  if (umurBulan === 0) return 'kurang dari 1 bulan'
  const tahun = Math.floor(umurBulan / 12)
  const bulan = umurBulan % 12
  if (tahun === 0) return `${bulan} bulan`
  return bulan === 0 ? `${tahun} tahun` : `${tahun} tahun ${bulan} bulan`
}
