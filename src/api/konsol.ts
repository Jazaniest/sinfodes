import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import {
  barisDesaKonsolSchema, detailDesaKonsolSchema, hasilTambahDesaSchema, hasilUbahAlamatSchema, hasilUndangSekdesSchema, periksaAlamatSchema,
  ringkasanKonsolSchema,
  sesiKonsolSchema, tiketBantuanSchema, usulanAlamatSchema,
  type FilterDesaKonsol, type TambahDesa, type UndangSekdes,
} from '@/domain/konsol/schema'
import { panggilApi } from './client'

export const kunciKonsol = {
  semua: ['konsol'] as const,
  sesi: ['konsol', 'sesi'] as const,
  ringkasan: ['konsol', 'ringkasan'] as const,
  desa: (filter: FilterDesaKonsol) => ['konsol', 'desa', filter] as const,
  detail: (id: string) => ['konsol', 'desa-detail', id] as const,
  usulanAlamat: (nama: string, kecamatan: string) => ['konsol', 'usulan-alamat', nama, kecamatan] as const,
  periksaAlamat: (label: string, desaId: string | undefined) => ['konsol', 'periksa-alamat', label, desaId ?? null] as const,
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

/** Tiket sekali pakai untuk membuka panel desa dalam mode bantuan, lihat saja (SPEC-V0.2 §5.3). */
export const ambilTiketBantuan = (desaId: string) =>
  panggilApi('POST', `/konsol/desa/${encodeURIComponent(desaId)}/tiket-bantuan`, { skema: tiketBantuanSchema, sesi: 'konsol' })

/** Ubah alamat website desa (SPEC-V0.2 §4.2); alamat lama tetap mengarah ke desa ini. */
export const ubahAlamatDesa = (desaId: string, alamat: string) =>
  panggilApi('PUT', `/konsol/desa/${encodeURIComponent(desaId)}/alamat`, { skema: hasilUbahAlamatSchema, body: { alamat }, sesi: 'konsol' })

/** Usulan alamat website desa baru dari nama dan kode kecamatan bertitik (SPEC-V0.2 §4.2). */
export const ambilUsulanAlamat = (nama: string, kecamatan: string, signal?: AbortSignal) =>
  panggilApi('GET', '/konsol/alamat-desa', { skema: usulanAlamatSchema, query: { nama, kecamatan }, signal, sesi: 'konsol' })
export const opsiUsulanAlamat = (nama: string, kecamatan: string) =>
  queryOptions({ queryKey: kunciKonsol.usulanAlamat(nama, kecamatan), queryFn: ({ signal }) => ambilUsulanAlamat(nama, kecamatan, signal) })

/** Periksa alamat; `desaId` untuk desa yang sudah ada, supaya aliasnya sendiri dianggap bisa dipakai. */
export const periksaAlamat = (label: string, desaId?: string, signal?: AbortSignal) =>
  panggilApi('GET', '/konsol/alamat-desa/periksa', { skema: periksaAlamatSchema, query: { label, desaId }, signal, sesi: 'konsol' })
export const opsiPeriksaAlamat = (label: string, desaId?: string) =>
  queryOptions({ queryKey: kunciKonsol.periksaAlamat(label, desaId), queryFn: ({ signal }) => periksaAlamat(label, desaId, signal) })
