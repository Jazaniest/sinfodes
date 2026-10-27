import { z } from 'zod'

export const KODE_GALAT = ['VALIDATION', 'CONFLICT', 'NOT_FOUND', 'FORBIDDEN', 'UNAUTHENTICATED', 'RATE_LIMITED', 'SERVER'] as const
export type KodeGalat = (typeof KODE_GALAT)[number]

export const metaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
})

/** Bentuk respons daftar (SPEC §3.4). */
export function daftarSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: metaSchema })
}

export const galatSchema = z.object({
  error: z.object({
    code: z.enum(KODE_GALAT),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
})
