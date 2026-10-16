import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { sesiAdminSchema } from '@/domain/pengguna/schema'
import { panggilApi } from './client'

export const hasilMasukSchema = z.object({ token: z.string(), sesi: sesiAdminSchema })
export const masuk = (email: string, kataSandi: string) =>
  panggilApi('POST', '/sesi/masuk', { skema: hasilMasukSchema, body: { email, kataSandi } })

export const ambilSesi = (signal?: AbortSignal) => panggilApi('GET', '/sesi', { skema: sesiAdminSchema, signal })

export const keluar = () => panggilApi('POST', '/sesi/keluar', { skema: z.undefined() })

export const kunciSesi = ['sesi'] as const

/** Sesi tidak basi dengan sendirinya; cache dibersihkan saat masuk, keluar, atau ganti peran. */
export const opsiSesi = () =>
  queryOptions({ queryKey: kunciSesi, queryFn: ({ signal }) => ambilSesi(signal), staleTime: Infinity })
