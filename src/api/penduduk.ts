import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import { entriRiwayatSchema } from '@/domain/penduduk/riwayat'
import { barisPendudukSchema, pendudukSchema, ringkasanPendudukSchema } from '@/domain/penduduk/schema'
import { panggilApi } from './client'

const daftarPendudukSchema = daftarSchema(barisPendudukSchema)
const daftarRiwayatSchema = z.array(entriRiwayatSchema)

export const kunciPenduduk = {
  semua: ['penduduk'] as const,
  daftar: (filter: Partial<FilterPenduduk>) => ['penduduk', 'daftar', filter] as const,
  /** Kata cari hanya ada di memori (kunci cache), tidak pernah di URL. */
  cari: (kata: string, filter: Partial<FilterPenduduk>) => ['penduduk', 'cari', kata, filter] as const,
  ringkasan: ['penduduk', 'ringkasan'] as const,
  detail: (id: string) => ['penduduk', 'detail', id] as const,
  riwayat: (id: string) => ['penduduk', 'riwayat', id] as const,
}

export function daftarPenduduk(filter: Partial<FilterPenduduk>, signal?: AbortSignal) {
  return panggilApi('GET', '/penduduk', { skema: daftarPendudukSchema, query: filter, signal })
}

/** Pencarian nama/NIK/nomor KK selalu lewat POST supaya NIK tidak masuk URL (SPEC §3.4). */
export function cariPenduduk(kata: string, filter: Partial<FilterPenduduk>, signal?: AbortSignal) {
  return panggilApi('POST', '/penduduk/cari', { skema: daftarPendudukSchema, body: { kata, filter }, signal })
}

export function ambilRingkasanPenduduk(signal?: AbortSignal) {
  return panggilApi('GET', '/penduduk/ringkasan', { skema: ringkasanPendudukSchema, signal })
}

export function ambilPenduduk(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/penduduk/${encodeURIComponent(id)}`, { skema: pendudukSchema, signal })
}

export function ambilRiwayatPenduduk(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/penduduk/${encodeURIComponent(id)}/riwayat`, { skema: daftarRiwayatSchema, signal })
}

export const opsiDaftarPenduduk = (filter: Partial<FilterPenduduk>) =>
  queryOptions({ queryKey: kunciPenduduk.daftar(filter), queryFn: ({ signal }) => daftarPenduduk(filter, signal) })

export const opsiCariPenduduk = (kata: string, filter: Partial<FilterPenduduk>) =>
  queryOptions({ queryKey: kunciPenduduk.cari(kata, filter), queryFn: ({ signal }) => cariPenduduk(kata, filter, signal) })

export const opsiRingkasanPenduduk = () =>
  queryOptions({ queryKey: kunciPenduduk.ringkasan, queryFn: ({ signal }) => ambilRingkasanPenduduk(signal) })

export const opsiPenduduk = (id: string) =>
  queryOptions({ queryKey: kunciPenduduk.detail(id), queryFn: ({ signal }) => ambilPenduduk(id, signal) })

export const opsiRiwayatPenduduk = (id: string) =>
  queryOptions({ queryKey: kunciPenduduk.riwayat(id), queryFn: ({ signal }) => ambilRiwayatPenduduk(id, signal) })
