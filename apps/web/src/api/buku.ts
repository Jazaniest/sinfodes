import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { isiBukuSchema, ringkasBukuSchema } from '@/domain/buku/schema'
import { panggilApi } from './client'

const daftarBukuSchema = z.array(ringkasBukuSchema)
export type HalamanBuku = { page: number; pageSize: number }

export const kunciBuku = {
  semua: ['buku'] as const,
  daftar: ['buku', 'daftar'] as const,
  isi: (kode: string, h: HalamanBuku) => ['buku', 'isi', kode, h] as const,
}

export function daftarBuku(signal?: AbortSignal) {
  return panggilApi('GET', '/buku-administrasi', { skema: daftarBukuSchema, signal })
}
export const opsiDaftarBuku = () => queryOptions({ queryKey: kunciBuku.daftar, queryFn: ({ signal }) => daftarBuku(signal) })

export function ambilIsiBuku(kode: string, h: HalamanBuku, signal?: AbortSignal) {
  return panggilApi('GET', `/buku-administrasi/${kode}`, { skema: isiBukuSchema, query: h, signal })
}
export const opsiIsiBuku = (kode: string, h: HalamanBuku) =>
  queryOptions({ queryKey: kunciBuku.isi(kode, h), queryFn: ({ signal }) => ambilIsiBuku(kode, h, signal) })
