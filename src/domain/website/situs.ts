import { z } from 'zod'
import { temaDasarSchema } from './tema'

/** Satu versi tampilan website desa: tema Dasar, kapan, dan siapa yang menyimpannya. */
export const versiSitusSchema = z.object({
  tema: temaDasarSchema,
  diperbarui: z.iso.datetime({ offset: true }),
  oleh: z.object({ id: z.string(), nama: z.string() }),
})
export type VersiSitus = z.infer<typeof versiSitusSchema>

/**
 * Dokumen `situs` per desa (SPEC-V0.2 §11.6). Tahap 7E-1 menulis langsung ke `terbit`; `draf` dan `riwayat` dipakai alur
 * draf → terbit di 7F tanpa mengubah bentuk dokumen.
 */
export type SitusDesa = { desaId: string; terbit: VersiSitus; draf: VersiSitus | null; riwayat: VersiSitus[] }

/** GET /website/situs. */
export const situsSchema = z.object({ terbit: versiSitusSchema })
export type SitusRespons = z.infer<typeof situsSchema>
