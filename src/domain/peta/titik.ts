import { z } from 'zod'

/** [bujur, lintang], urutan yang sama dengan GeoJSON dan MapLibre. */
export const titikSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
export type Titik = z.infer<typeof titikSchema>
