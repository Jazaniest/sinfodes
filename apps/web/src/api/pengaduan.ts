import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import {
  barisPengaduanSchema, jumlahPengaduanSchema, pengaduanSchema, type FilterPengaduan, type StatusTujuan,
} from '@/domain/pengaduan/schema'
import { panggilApi } from './client'

const daftarPengaduanSchema = daftarSchema(barisPengaduanSchema)

export const kunciPengaduan = {
  semua: ['pengaduan'] as const,
  daftar: (f: Partial<FilterPengaduan>) => ['pengaduan', 'daftar', f] as const,
  jumlah: ['pengaduan', 'jumlah'] as const,
  detail: (id: string) => ['pengaduan', 'detail', id] as const,
}

export function daftarPengaduan(filter: Partial<FilterPengaduan>, signal?: AbortSignal) {
  return panggilApi('GET', '/pengaduan', { skema: daftarPengaduanSchema, query: filter, signal })
}

export const opsiDaftarPengaduan = (filter: Partial<FilterPengaduan>) =>
  queryOptions({ queryKey: kunciPengaduan.daftar(filter), queryFn: ({ signal }) => daftarPengaduan(filter, signal) })

export function ambilJumlahPengaduan(signal?: AbortSignal) {
  return panggilApi('GET', '/pengaduan/jumlah', { skema: jumlahPengaduanSchema, signal })
}

/** Jumlah per status untuk tab, dan angka menu Pengaduan. */
export const opsiJumlahPengaduan = () => queryOptions({ queryKey: kunciPengaduan.jumlah, queryFn: ({ signal }) => ambilJumlahPengaduan(signal) })

export function ambilPengaduan(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/pengaduan/${id}`, { skema: pengaduanSchema, signal })
}

export const opsiPengaduan = (id: string) => queryOptions({ queryKey: kunciPengaduan.detail(id), queryFn: ({ signal }) => ambilPengaduan(id, signal) })

export function balasPengaduan(id: string, isi: string) {
  return panggilApi('POST', `/pengaduan/${id}/balasan`, { skema: pengaduanSchema, body: { isi } })
}

export function ubahStatusPengaduan(id: string, status: StatusTujuan) {
  return panggilApi('POST', `/pengaduan/${id}/status`, { skema: pengaduanSchema, body: { status } })
}
