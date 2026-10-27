import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import { hasilTerapkanSchema, laporanDataSchema, type FilterLaporan } from '@/domain/laporan/schema'
import { panggilApi } from './client'

const daftarLaporanSchema = daftarSchema(laporanDataSchema)
const hasilTolakSchema = z.object({ laporan: laporanDataSchema })

export const kunciLaporan = {
  semua: ['laporan-data'] as const,
  daftar: (filter: FilterLaporan) => ['laporan-data', 'daftar', filter] as const,
  detail: (id: string) => ['laporan-data', 'detail', id] as const,
}

export function daftarLaporan(filter: FilterLaporan, signal?: AbortSignal) {
  return panggilApi('GET', '/laporan-data', { skema: daftarLaporanSchema, query: filter, signal })
}

export function ambilLaporan(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/laporan-data/${encodeURIComponent(id)}`, { skema: laporanDataSchema, signal })
}

export function terapkanLaporan(id: string) {
  return panggilApi('POST', `/laporan-data/${encodeURIComponent(id)}/terapkan`, { skema: hasilTerapkanSchema })
}

export function tolakLaporan(id: string, alasan: string | null) {
  return panggilApi('POST', `/laporan-data/${encodeURIComponent(id)}/tolak`, { skema: hasilTolakSchema, body: { alasan } })
}

/** Laporan perbaikan yang belum ditangani untuk satu penduduk: banner di profilnya (SPEC §6.3). */
export const opsiLaporanPerbaikan = (pendudukId: string) => {
  const filter: FilterLaporan = { status: 'baru', jenis: 'perbaikan', pendudukId }
  return queryOptions({ queryKey: kunciLaporan.daftar(filter), queryFn: ({ signal }) => daftarLaporan(filter, signal) })
}

export const opsiLaporan = (id: string) =>
  queryOptions({ queryKey: kunciLaporan.detail(id), queryFn: ({ signal }) => ambilLaporan(id, signal) })
