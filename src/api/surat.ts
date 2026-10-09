import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { jenisSuratSchema } from '@/domain/surat/jenis'
import {
  barisPermohonanSchema, detailPermohonanSchema, jumlahPermohonanSchema,
  type AksiSurat, type FilterPermohonan, type PeriodePermohonan,
} from '@/domain/surat/permohonan'
import { panggilApi } from './client'

const daftarJenisSchema = daftarSchema(jenisSuratSchema)
const daftarPermohonanSchema = daftarSchema(barisPermohonanSchema)

export const kunciSurat = {
  jenis: ['jenis-surat'] as const,
  semua: ['permohonan'] as const,
  daftar: (filter: Partial<FilterPermohonan>) => ['permohonan', 'daftar', filter] as const,
  /** Kata cari hanya ada di memori (kunci cache), tidak pernah di URL. */
  cari: (kata: string, jenis: string | null) => ['permohonan', 'cari', kata, jenis] as const,
  jumlah: (periode: PeriodePermohonan, jenis: string | null) => ['permohonan', 'jumlah', periode, jenis] as const,
  detail: (id: string) => ['permohonan', 'detail', id] as const,
}

export function daftarJenisSurat(signal?: AbortSignal) {
  return panggilApi('GET', '/jenis-surat', { skema: daftarJenisSchema, signal })
}

export const opsiJenisSurat = () =>
  queryOptions({ queryKey: kunciSurat.jenis, queryFn: ({ signal }) => daftarJenisSurat(signal), staleTime: 5 * 60_000 })

export function daftarPermohonan(filter: Partial<FilterPermohonan>, signal?: AbortSignal) {
  return panggilApi('GET', '/permohonan', { skema: daftarPermohonanSchema, query: filter, signal })
}

/** Cari nama, NIK, atau nomor surat lewat POST supaya NIK tidak masuk URL (SPEC §3.4). Semua status, terbaru dulu. */
export function cariPermohonan(kata: string, jenis: string | null, signal?: AbortSignal) {
  return panggilApi('POST', '/permohonan/cari', { skema: daftarPermohonanSchema, body: { kata, jenis }, signal })
}

export function ambilJumlahPermohonan(periode: PeriodePermohonan, jenis: string | null, signal?: AbortSignal) {
  return panggilApi('GET', '/permohonan/jumlah', { skema: jumlahPermohonanSchema, query: { periode, jenis }, signal })
}

/** Jumlah per status untuk tab, dan angka menu Layanan Surat. */
export const opsiJumlahPermohonan = (periode: PeriodePermohonan = 14, jenis: string | null = null) =>
  queryOptions({ queryKey: kunciSurat.jumlah(periode, jenis), queryFn: ({ signal }) => ambilJumlahPermohonan(periode, jenis, signal) })

export function ambilPermohonan(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/permohonan/${encodeURIComponent(id)}`, { skema: detailPermohonanSchema, signal })
}

export const opsiPermohonan = (id: string) =>
  queryOptions({ queryKey: kunciSurat.detail(id), queryFn: ({ signal }) => ambilPermohonan(id, signal) })

export function ubahPermohonan(id: string, ubah: { isian?: Record<string, string>; catatanInternal?: string | null }) {
  return panggilApi('PATCH', `/permohonan/${encodeURIComponent(id)}`, { skema: detailPermohonanSchema, body: ubah })
}

/** Aksi status (SPEC §7.1). Badannya: { alasan }, { catatan }, { passphrase }, { isian }, atau kosong. */
export function jalankanAksi(id: string, aksi: AksiSurat, body: object = {}) {
  return panggilApi('POST', `/permohonan/${encodeURIComponent(id)}/${aksi}`, { skema: detailPermohonanSchema, body })
}
