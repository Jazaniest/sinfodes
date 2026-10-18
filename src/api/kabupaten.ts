import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { pemantauanSchema } from '@/domain/kabupaten/pemantauan'
import { ringkasanKabupatenSchema, sesiKabupatenSchema } from '@/domain/kabupaten/schema'
import { panggilApi } from './client'

/** Dasbor kabupaten (SPEC-V0.2 §8). Semua panggilan memakai sesi kabupaten, kecuali portal publik. */
export const kunciKabupaten = {
  semua: ['kabupaten'] as const,
  sesi: ['kabupaten', 'sesi'] as const,
  ringkasan: ['kabupaten', 'ringkasan'] as const,
  pemantauan: ['kabupaten', 'pemantauan'] as const,
}

export const hasilMasukKabupatenSchema = z.object({ token: z.string(), sesi: sesiKabupatenSchema })

export const masukKabupaten = (email: string, kataSandi: string) =>
  panggilApi('POST', '/kabupaten/sesi/masuk', { skema: hasilMasukKabupatenSchema, body: { email, kataSandi }, sesi: 'kabupaten' })

export const ambilSesiKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/sesi', { skema: sesiKabupatenSchema, signal, sesi: 'kabupaten' })

export const keluarKabupaten = () => panggilApi('POST', '/kabupaten/sesi/keluar', { skema: z.undefined(), sesi: 'kabupaten' })

/** Sesi kabupaten tidak basi dengan sendirinya; cache dibersihkan saat masuk dan keluar. */
export const opsiSesiKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.sesi, queryFn: ({ signal }) => ambilSesiKabupaten(signal), staleTime: Infinity })

export const ambilRingkasanKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/ringkasan', { skema: ringkasanKabupatenSchema, signal, sesi: 'kabupaten' })
export const opsiRingkasanKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.ringkasan, queryFn: ({ signal }) => ambilRingkasanKabupaten(signal) })

export const ambilPemantauanKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/pemantauan', { skema: pemantauanSchema, signal, sesi: 'kabupaten' })
export const opsiPemantauanKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.pemantauan, queryFn: ({ signal }) => ambilPemantauanKabupaten(signal) })
