import { z } from 'zod'
import { FORMAT_NOMOR_BAWAAN } from './nomor-surat'

export const UKURAN_KERTAS = ['A4', 'F4'] as const
export type UkuranKertas = (typeof UKURAN_KERTAS)[number]
export const HURUF_SURAT = ['Tinos', 'Arimo'] as const
export type HurufSurat = (typeof HURUF_SURAT)[number]
export const MODE_TANDA_TANGAN = ['tte', 'basah'] as const
export type ModeTandaTangan = (typeof MODE_TANDA_TANGAN)[number]

/** Pengaturan surat per desa (SPEC §7.2, §7.5). Layar pengaturannya dibuat di Tahap 3. */
export const pengaturanSuratSchema = z.object({
  desaId: z.string(),
  kertas: z.enum(UKURAN_KERTAS),
  huruf: z.enum(HURUF_SURAT),
  modeTandaTangan: z.enum(MODE_TANDA_TANGAN),
  formatNomor: z.string().min(1),
  urutan: z.enum(['per-tahun', 'per-jenis']),
})
export type PengaturanSurat = z.infer<typeof pengaturanSuratSchema>

export const pengaturanBawaan = (desaId: string): PengaturanSurat => ({
  desaId,
  kertas: 'A4',
  huruf: 'Tinos',
  modeTandaTangan: 'tte',
  formatNomor: FORMAT_NOMOR_BAWAAN,
  urutan: 'per-tahun',
})
