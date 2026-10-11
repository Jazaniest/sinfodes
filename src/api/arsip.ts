import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import {
  barisSuratKeluarSchema, suratMasukSchema, type FilterSuratKeluar, type FilterSuratMasuk, type IsianSuratMasuk,
} from '@/domain/surat/arsip'
import { panggilApi } from './client'

const daftarKeluarSchema = daftarSchema(barisSuratKeluarSchema)
const daftarMasukSchema = daftarSchema(suratMasukSchema)

export const kunciArsip = {
  semua: ['arsip'] as const,
  keluar: (f: Partial<FilterSuratKeluar>) => ['arsip', 'keluar', f] as const,
  masuk: (f: Partial<FilterSuratMasuk>) => ['arsip', 'masuk', f] as const,
}

export function daftarSuratKeluar(filter: Partial<FilterSuratKeluar>, signal?: AbortSignal) {
  return panggilApi('GET', '/surat-keluar', { skema: daftarKeluarSchema, query: filter, signal })
}

export const opsiSuratKeluar = (filter: Partial<FilterSuratKeluar>) =>
  queryOptions({ queryKey: kunciArsip.keluar(filter), queryFn: ({ signal }) => daftarSuratKeluar(filter, signal) })

/** Semua surat sesuai filter, tanpa halaman: bahan Buku Agenda Surat Keluar (CSV dan cetak). */
export async function semuaSuratKeluar(filter: Omit<Partial<FilterSuratKeluar>, 'page' | 'pageSize'>) {
  const hasil = await panggilApi('GET', '/surat-keluar', { skema: daftarKeluarSchema, query: { ...filter, semua: 1 } })
  return hasil.data
}

export function daftarSuratMasuk(filter: Partial<FilterSuratMasuk>, signal?: AbortSignal) {
  return panggilApi('GET', '/surat-masuk', { skema: daftarMasukSchema, query: filter, signal })
}

export const opsiSuratMasuk = (filter: Partial<FilterSuratMasuk>) =>
  queryOptions({ queryKey: kunciArsip.masuk(filter), queryFn: ({ signal }) => daftarSuratMasuk(filter, signal) })

/** Catat surat masuk; scan (opsional) ikut dalam FormData yang sama. */
export function catatSuratMasuk(isian: IsianSuratMasuk, scan: File | null) {
  const isi = new FormData()
  for (const [kunci, nilai] of Object.entries(isian)) isi.append(kunci, nilai ?? '')
  if (scan) isi.append('scan', scan)
  return panggilApi('POST', '/surat-masuk', { skema: suratMasukSchema, body: isi })
}
