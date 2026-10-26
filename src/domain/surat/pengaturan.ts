import { z } from 'zod'
import { tataLetakSuratSchema } from './tata-letak'

export const MODE_TANDA_TANGAN = ['tte', 'basah'] as const
export type ModeTandaTangan = (typeof MODE_TANDA_TANGAN)[number]

/** Pengaturan surat per desa (SPEC §7.2, §7.5). Kertas, huruf, kop, dan tanda tangan ada di `tataLetak` (SPEC-V0.2 12.2). */
export const pengaturanSuratSchema = z.object({
  desaId: z.string(),
  tataLetak: tataLetakSuratSchema,
  modeTandaTangan: z.enum(MODE_TANDA_TANGAN),
  formatNomor: z.string().min(1),
  urutan: z.enum(['per-tahun', 'per-jenis']),
})
export type PengaturanSurat = z.infer<typeof pengaturanSuratSchema>
