import { queryOptions } from '@tanstack/react-query'
import { hasilCariDesaSchema, ringkasanIndukSchema } from '@/domain/alamat/schema'
import { panggilApi } from './client'

/** Halaman utama Sinfodes (SPEC-V0.2 §4.4); semuanya tanpa token. */
export const kunciInduk = {
  cariDesa: (q: string) => ['induk', 'cari-desa', q] as const,
  ringkasan: ['induk', 'ringkasan'] as const,
}

export const cariDesa = (q: string, signal?: AbortSignal) =>
  panggilApi('GET', '/induk/cari-desa', { skema: hasilCariDesaSchema, query: { q }, signal, sesi: null })
export const opsiCariDesa = (q: string) => queryOptions({ queryKey: kunciInduk.cariDesa(q), queryFn: ({ signal }) => cariDesa(q, signal) })

export const ambilRingkasanInduk = (signal?: AbortSignal) =>
  panggilApi('GET', '/induk/ringkasan', { skema: ringkasanIndukSchema, signal, sesi: null })
export const opsiRingkasanInduk = () => queryOptions({ queryKey: kunciInduk.ringkasan, queryFn: ({ signal }) => ambilRingkasanInduk(signal) })
