import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { hasilMasukSchema, sesiAdminSchema, type HasilMasuk } from '@/domain/pengguna/schema'
import { panggilApi, SESI_KUKI } from './client'

export { hasilMasukSchema }

/** Server nyata tidak mengirim token (sesi di cookie HttpOnly): pemanggil memakai penanda lokal sebagai tanda "sudah masuk". */
const denganToken = (hasil: HasilMasuk): HasilMasuk & { token: string } => ({ ...hasil, token: hasil.token ?? SESI_KUKI })

export const masuk = async (email: string, kataSandi: string) =>
  denganToken(await panggilApi('POST', '/sesi/masuk', { skema: hasilMasukSchema, body: { email, kataSandi } }))

/** Tukar tiket bantuan dari Konsol menjadi sesi panel lihat saja (SPEC-V0.2 §5.3). Tanpa token: sesi lama tidak ikut. */
export const tukarTiketBantuan = async (tiket: string) =>
  denganToken(await panggilApi('POST', '/sesi/bantuan', { skema: hasilMasukSchema, body: { tiket }, sesi: null }))

export const ambilSesi = (signal?: AbortSignal) => panggilApi('GET', '/sesi', { skema: sesiAdminSchema, signal })

export const keluar = () => panggilApi('POST', '/sesi/keluar', { skema: z.undefined() })

export const kunciSesi = ['sesi'] as const

/** Sesi tidak basi dengan sendirinya; cache dibersihkan saat masuk, keluar, atau ganti peran. */
export const opsiSesi = () =>
  queryOptions({ queryKey: kunciSesi, queryFn: ({ signal }) => ambilSesi(signal), staleTime: Infinity })
