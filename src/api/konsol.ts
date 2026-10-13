import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import { pemantauanSchema } from '@/domain/konsol/pemantauan'
import {
  barisDesaKonsolSchema, detailDesaKonsolSchema, hasilTambahDesaSchema, hasilUndangSekdesSchema, ringkasanKonsolSchema, sesiKonsolSchema,
  type FilterDesaKonsol, type TambahDesa, type UndangSekdes,
} from '@/domain/konsol/schema'
import { panggilApi } from './client'

export const kunciKonsol = {
  semua: ['konsol'] as const,
  sesi: ['konsol', 'sesi'] as const,
  ringkasan: ['konsol', 'ringkasan'] as const,
  desa: (filter: FilterDesaKonsol) => ['konsol', 'desa', filter] as const,
  detail: (id: string) => ['konsol', 'desa-detail', id] as const,
  pemantauan: (wilayah: string | null) => ['konsol', 'pemantauan', wilayah] as const,
}

export const hasilMasukKonsolSchema = z.object({ token: z.string(), sesi: sesiKonsolSchema })

export const masukKonsol = (email: string, kataSandi: string) =>
  panggilApi('POST', '/konsol/sesi/masuk', { skema: hasilMasukKonsolSchema, body: { email, kataSandi }, sesi: 'konsol' })

export const ambilSesiKonsol = (signal?: AbortSignal) => panggilApi('GET', '/konsol/sesi', { skema: sesiKonsolSchema, signal, sesi: 'konsol' })

export const keluarKonsol = () => panggilApi('POST', '/konsol/sesi/keluar', { skema: z.undefined(), sesi: 'konsol' })

/** Sesi konsol tidak basi dengan sendirinya; cache dibersihkan saat masuk dan keluar. */
export const opsiSesiKonsol = () =>
  queryOptions({ queryKey: kunciKonsol.sesi, queryFn: ({ signal }) => ambilSesiKonsol(signal), staleTime: Infinity })

export const ambilRingkasanKonsol = (signal?: AbortSignal) =>
  panggilApi('GET', '/konsol/ringkasan', { skema: ringkasanKonsolSchema, signal, sesi: 'konsol' })
export const opsiRingkasanKonsol = () =>
  queryOptions({ queryKey: kunciKonsol.ringkasan, queryFn: ({ signal }) => ambilRingkasanKonsol(signal) })

export const daftarDesaKonsol = (filter: FilterDesaKonsol, signal?: AbortSignal) =>
  panggilApi('GET', '/konsol/desa', { skema: daftarSchema(barisDesaKonsolSchema), query: filter, signal, sesi: 'konsol' })
export const opsiDaftarDesaKonsol = (filter: FilterDesaKonsol) =>
  queryOptions({ queryKey: kunciKonsol.desa(filter), queryFn: async ({ signal }) => (await daftarDesaKonsol(filter, signal)).data })

export const ambilDetailDesaKonsol = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/konsol/desa/${encodeURIComponent(id)}`, { skema: detailDesaKonsolSchema, signal, sesi: 'konsol' })
export const opsiDetailDesaKonsol = (id: string) =>
  queryOptions({ queryKey: kunciKonsol.detail(id), queryFn: ({ signal }) => ambilDetailDesaKonsol(id, signal) })

export const tambahDesa = (isian: TambahDesa) =>
  panggilApi('POST', '/konsol/desa', { skema: hasilTambahDesaSchema, body: isian, sesi: 'konsol' })

/** Undang Sekretaris Desa untuk desa yang belum punya (tahap 6C). */
export const undangSekdes = (desaId: string, isian: UndangSekdes) =>
  panggilApi('POST', `/konsol/desa/${encodeURIComponent(desaId)}/sekdes`, { skema: hasilUndangSekdesSchema, body: isian, sesi: 'konsol' })

/** `wilayah` null: pemantau memakai wilayahnya sendiri; Tim Sinfodes wajib memilih kabupaten. */
export const ambilPemantauan = (wilayah: string | null, signal?: AbortSignal) =>
  panggilApi('GET', '/konsol/pemantauan', { skema: pemantauanSchema, query: wilayah ? { wilayah } : {}, signal, sesi: 'konsol' })
export const opsiPemantauan = (wilayah: string | null) =>
  queryOptions({ queryKey: kunciKonsol.pemantauan(wilayah), queryFn: ({ signal }) => ambilPemantauan(wilayah, signal) })
