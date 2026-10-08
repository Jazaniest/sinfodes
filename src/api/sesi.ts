import { z } from 'zod'
import { sesiAdminSchema } from '@/domain/pengguna/schema'
import { panggilApi } from './client'

export const hasilMasukSchema = z.object({ token: z.string(), sesi: sesiAdminSchema })

export const masuk = (email: string, kataSandi: string) =>
  panggilApi('POST', '/sesi/masuk', { skema: hasilMasukSchema, body: { email, kataSandi } })

export const ambilSesi = (signal?: AbortSignal) => panggilApi('GET', '/sesi', { skema: sesiAdminSchema, signal })

export const keluar = () => panggilApi('POST', '/sesi/keluar', { skema: z.undefined() })
