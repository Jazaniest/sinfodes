import { galatDariZod } from '@sinfodes/kontrak/format/galat-isian'
import type { z } from 'zod'
import { GalatApp } from './galat'

/** Isian yang tidak lolos skema kontrak: 422 dengan satu pesan per field, sama dengan API tiruan. */
export const galatIsian = (galat: z.ZodError): GalatApp =>
  new GalatApp('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, galatDariZod(galat))

/** Galat yang terkait satu field: 422 untuk isian yang salah, 409 untuk tabrakan dengan data yang ada (mis. NIK ganda). */
export const galatField = (field: string, pesan: string, kode: 'VALIDATION' | 'CONFLICT' = 'VALIDATION'): GalatApp =>
  new GalatApp(kode, pesan, kode === 'CONFLICT' ? 409 : 422, { [field]: pesan })
