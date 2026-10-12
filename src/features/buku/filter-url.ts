import { z } from 'zod'
import { bacaFilterUrl } from '../admin/baca-filter'

/** `?page=&pageSize=` di halaman isi buku. */
export const halamanBukuSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
})
export type HalamanBukuUrl = z.infer<typeof halamanBukuSchema>

export const HALAMAN_BUKU_BAWAAN: HalamanBukuUrl = halamanBukuSchema.parse({})

export const bacaHalamanBuku = (cari: Record<string, unknown>): HalamanBukuUrl => bacaFilterUrl(halamanBukuSchema, cari)
