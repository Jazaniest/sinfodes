import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { barisKegiatanSchema } from '@/domain/pembangunan/schema'
import { panggilApi } from './client'

const daftarKegiatanSchema = daftarSchema(barisKegiatanSchema)

export const kunciPembangunan = {
  semua: ['pembangunan'] as const,
  daftar: ['pembangunan', 'daftar'] as const,
  detail: (id: string) => ['pembangunan', 'detail', id] as const,
}

export function daftarKegiatan(signal?: AbortSignal) {
  return panggilApi('GET', '/pembangunan/kegiatan', { skema: daftarKegiatanSchema, signal })
}

export const opsiDaftarKegiatan = () => queryOptions({ queryKey: kunciPembangunan.daftar, queryFn: ({ signal }) => daftarKegiatan(signal) })

export function ambilKegiatan(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/pembangunan/kegiatan/${id}`, { skema: barisKegiatanSchema, signal })
}

export const opsiKegiatan = (id: string) => queryOptions({ queryKey: kunciPembangunan.detail(id), queryFn: ({ signal }) => ambilKegiatan(id, signal) })
