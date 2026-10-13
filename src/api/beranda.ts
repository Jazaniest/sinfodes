import { queryOptions } from '@tanstack/react-query'
import { berandaSchema } from '@/domain/beranda/schema'
import { panggilApi } from './client'

export const ambilBeranda = (signal?: AbortSignal) => panggilApi('GET', '/beranda', { skema: berandaSchema, signal })

/** Beranda merangkum semua modul, termasuk progres persiapan desa baru, jadi selalu dimuat ulang saat dibuka (tahap 6C). */
export const opsiBeranda = () => queryOptions({ queryKey: ['beranda'] as const, queryFn: ({ signal }) => ambilBeranda(signal), staleTime: 0 })
