import { queryOptions } from '@tanstack/react-query'
import { aksesSinfodesSchema, type BeriAkses } from '@/domain/pengaturan/akses-sinfodes'
import { pengaturanDesaSchema, type IdentitasDesa } from '@/domain/pengaturan/identitas'
import { daftarPenggunaDesaSchema, type UbahPengguna, type UndangPengguna } from '@/domain/pengaturan/pengguna'
import { penomoranSchema, type UbahPenomoran } from '@/domain/pengaturan/penomoran'
import { wilayahDesaSchema, type UbahWilayah } from '@/domain/pengaturan/wilayah'
import { penggunaSchema } from '@/domain/pengguna/schema'
import { panggilApi } from './client'

export const kunciPengaturan = {
  semua: ['pengaturan'] as const,
  desa: ['pengaturan', 'desa'] as const,
  wilayah: ['pengaturan', 'wilayah'] as const,
  penomoran: ['pengaturan', 'penomoran'] as const,
  pengguna: ['pengaturan', 'pengguna'] as const,
  aksesSinfodes: ['pengaturan', 'akses-sinfodes'] as const,
}

export function ambilPengaturanDesa(signal?: AbortSignal) {
  return panggilApi('GET', '/pengaturan/desa', { skema: pengaturanDesaSchema, signal })
}
export const opsiPengaturanDesa = () =>
  queryOptions({ queryKey: kunciPengaturan.desa, queryFn: ({ signal }) => ambilPengaturanDesa(signal) })
export function simpanIdentitas(isian: IdentitasDesa) {
  return panggilApi('PUT', '/pengaturan/desa', { skema: pengaturanDesaSchema, body: isian })
}

export function ambilWilayah(signal?: AbortSignal) {
  return panggilApi('GET', '/pengaturan/wilayah', { skema: wilayahDesaSchema, signal })
}
export const opsiWilayah = () => queryOptions({ queryKey: kunciPengaturan.wilayah, queryFn: ({ signal }) => ambilWilayah(signal) })
export function simpanWilayah(isian: UbahWilayah) {
  return panggilApi('PUT', '/pengaturan/wilayah', { skema: wilayahDesaSchema, body: isian })
}

export function ambilPenomoran(signal?: AbortSignal) {
  return panggilApi('GET', '/pengaturan/penomoran', { skema: penomoranSchema, signal })
}
export const opsiPenomoran = () => queryOptions({ queryKey: kunciPengaturan.penomoran, queryFn: ({ signal }) => ambilPenomoran(signal) })
export function simpanPenomoran(isian: UbahPenomoran) {
  return panggilApi('PUT', '/pengaturan/penomoran', { skema: penomoranSchema, body: isian })
}

export function daftarPenggunaDesa(signal?: AbortSignal) {
  return panggilApi('GET', '/pengaturan/pengguna', { skema: daftarPenggunaDesaSchema, signal })
}
export const opsiPenggunaDesa = () =>
  queryOptions({ queryKey: kunciPengaturan.pengguna, queryFn: ({ signal }) => daftarPenggunaDesa(signal) })
export function undangPengguna(isian: UndangPengguna) {
  return panggilApi('POST', '/pengaturan/pengguna', { skema: penggunaSchema, body: isian })
}
export function ubahPengguna(id: string, isian: UbahPengguna) {
  return panggilApi('PATCH', `/pengaturan/pengguna/${id}`, { skema: penggunaSchema, body: isian })
}

/** Akses bantuan Tim Sinfodes (SPEC-V0.2 §5.3): hanya Sekretaris dan Kepala Desa. */
export function ambilAksesSinfodes(signal?: AbortSignal) {
  return panggilApi('GET', '/pengaturan/akses-sinfodes', { skema: aksesSinfodesSchema, signal })
}
export const opsiAksesSinfodes = () =>
  queryOptions({ queryKey: kunciPengaturan.aksesSinfodes, queryFn: ({ signal }) => ambilAksesSinfodes(signal) })
export function beriAksesSinfodes(isian: BeriAkses) {
  return panggilApi('POST', '/pengaturan/akses-sinfodes', { skema: aksesSinfodesSchema, body: isian })
}
export function cabutAksesSinfodes() {
  return panggilApi('DELETE', '/pengaturan/akses-sinfodes', { skema: aksesSinfodesSchema })
}
