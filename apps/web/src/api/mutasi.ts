import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { barisMutasiSchema, ringkasanMutasiSchema, type FilterMutasi } from '@/domain/mutasi/buku'
import {
  hasilMutasiSchema, type MasukanDatang, type MasukanLahir, type MasukanMeninggal, type MasukanPindah,
} from '@/domain/mutasi/masukan'
import { panggilApi } from './client'

const daftarMutasiSchema = daftarSchema(barisMutasiSchema)

export const kunciMutasi = {
  semua: ['mutasi'] as const,
  daftar: (filter: Partial<FilterMutasi>) => ['mutasi', 'daftar', filter] as const,
  ringkasan: (bulan: string) => ['mutasi', 'ringkasan', bulan] as const,
}

export function daftarMutasi(filter: Partial<FilterMutasi>, signal?: AbortSignal) {
  return panggilApi('GET', '/mutasi', { skema: daftarMutasiSchema, query: filter, signal })
}

export function ambilRingkasanMutasi(bulan: string, signal?: AbortSignal) {
  return panggilApi('GET', '/mutasi/ringkasan', { skema: ringkasanMutasiSchema, query: { bulan }, signal })
}

export const catatLahir = (masukan: MasukanLahir, kunciIdempotensi?: string) =>
  panggilApi('POST', '/mutasi/lahir', { skema: hasilMutasiSchema, body: masukan, kunciIdempotensi })

export const catatMeninggal = (masukan: MasukanMeninggal, kunciIdempotensi?: string) =>
  panggilApi('POST', '/mutasi/meninggal', { skema: hasilMutasiSchema, body: masukan, kunciIdempotensi })

export const catatPindah = (masukan: MasukanPindah, kunciIdempotensi?: string) =>
  panggilApi('POST', '/mutasi/pindah', { skema: hasilMutasiSchema, body: masukan, kunciIdempotensi })

export const catatDatang = (masukan: MasukanDatang, kunciIdempotensi?: string) =>
  panggilApi('POST', '/mutasi/datang', { skema: hasilMutasiSchema, body: masukan, kunciIdempotensi })

export const opsiDaftarMutasi = (filter: Partial<FilterMutasi>) =>
  queryOptions({ queryKey: kunciMutasi.daftar(filter), queryFn: ({ signal }) => daftarMutasi(filter, signal) })

export const opsiRingkasanMutasi = (bulan: string) =>
  queryOptions({ queryKey: kunciMutasi.ringkasan(bulan), queryFn: ({ signal }) => ambilRingkasanMutasi(bulan, signal) })
