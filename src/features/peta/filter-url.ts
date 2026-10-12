import { z } from 'zod'
import { bacaFilterUrl } from '../admin/baca-filter'

/** `?kegiatan=` dari tombol "Lihat di peta" di detail pembangunan. */
export const pilihanPetaSchema = z.object({ kegiatan: z.string().min(1).optional() })
export type PilihanPeta = z.infer<typeof pilihanPetaSchema>

export const PILIHAN_PETA_BAWAAN: PilihanPeta = {}

export const bacaPilihanPeta = (cari: Record<string, unknown>): PilihanPeta => bacaFilterUrl(pilihanPetaSchema, cari)
