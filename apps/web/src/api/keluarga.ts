import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { barisKeluargaSchema, detailKeluargaSchema, type FilterKeluarga } from '@/domain/keluarga/schema'
import type { GantiKepala, MasukanPecahKeluarga } from '@/domain/keluarga/masukan'
import { panggilApi } from './client'

const daftarKeluargaSchema = daftarSchema(barisKeluargaSchema)

export const kunciKeluarga = {
  semua: ['keluarga'] as const,
  daftar: (filter: Partial<FilterKeluarga>) => ['keluarga', 'daftar', filter] as const,
  cari: (kata: string, filter: Partial<FilterKeluarga>) => ['keluarga', 'cari', kata, filter] as const,
  detail: (id: string) => ['keluarga', 'detail', id] as const,
}

export function daftarKeluarga(filter: Partial<FilterKeluarga>, signal?: AbortSignal) {
  return panggilApi('GET', '/keluarga', { skema: daftarKeluargaSchema, query: filter, signal })
}

/** Cari nomor KK atau nama kepala keluarga lewat POST (SPEC §6.5). */
export function cariKeluarga(kata: string, filter: Partial<FilterKeluarga>, signal?: AbortSignal) {
  return panggilApi('POST', '/keluarga/cari', { skema: daftarKeluargaSchema, body: { kata, filter }, signal })
}

export function ambilKeluarga(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/keluarga/${encodeURIComponent(id)}`, { skema: detailKeluargaSchema, signal })
}

export function gantiKepala(id: string, masukan: GantiKepala) {
  return panggilApi('POST', `/keluarga/${encodeURIComponent(id)}/ganti-kepala`, { skema: detailKeluargaSchema, body: masukan })
}

/** Mengembalikan detail KK baru (SPEC §6.5). */
export function pecahKeluarga(id: string, masukan: MasukanPecahKeluarga) {
  return panggilApi('POST', `/keluarga/${encodeURIComponent(id)}/pecah`, { skema: detailKeluargaSchema, body: masukan })
}

export const opsiKeluarga = (id: string) =>
  queryOptions({ queryKey: kunciKeluarga.detail(id), queryFn: ({ signal }) => ambilKeluarga(id, signal) })
