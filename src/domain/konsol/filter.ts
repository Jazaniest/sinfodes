import { z } from 'zod'
import { STATUS_DESA } from '../wilayah/schema'

/** Paket langganan (SPEC §16): harga hanya muncul di tagihan dummy Konsol. */
export const PAKET = ['Dasar', 'Lengkap'] as const
export type Paket = (typeof PAKET)[number]
export const HARGA_TRIWULAN: Readonly<Record<Paket, number>> = { Dasar: 1_500_000, Lengkap: 3_000_000 }

/** GET /konsol/desa. Semua filter boleh kosong. */
export const filterDesaKonsolSchema = z.object({
  provinsi: z.string().regex(/^\d{2}$/).optional(),
  kabupaten: z.string().regex(/^\d{2}\.\d{2}$/).optional(),
  status: z.enum(STATUS_DESA).optional(),
  paket: z.enum(PAKET).optional(),
})
export type FilterDesaKonsol = z.infer<typeof filterDesaKonsolSchema>
