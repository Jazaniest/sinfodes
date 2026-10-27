import { queryOptions } from '@tanstack/react-query'
import { hasilAlamatSchema } from '@/domain/alamat/schema'
import { panggilApi } from './client'

/** Isi alamat ini menurut server (SPEC-V0.2 §4.5); tanpa token. */
export const ambilAlamat = (signal?: AbortSignal) => panggilApi('GET', '/alamat', { skema: hasilAlamatSchema, signal, sesi: null })

export const kunciAlamat = ['alamat'] as const

/** Alamat tidak berubah selama halaman terbuka. */
export const opsiAlamat = () => queryOptions({ queryKey: kunciAlamat, queryFn: ({ signal }) => ambilAlamat(signal), staleTime: Infinity })
