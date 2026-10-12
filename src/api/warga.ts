import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { berandaWargaSchema } from '@/domain/warga/beranda'
import { detailPermohonanWargaSchema, ringkasPermohonanWargaSchema } from '@/domain/warga/permohonan'
import { hasilLupaPinSchema, hasilMasukWargaSchema, sesiWargaSchema, type UbahAkunWarga } from '@/domain/warga/sesi'
import { panggilApi } from './client'

/** Semua kueri layanan warga berawalan 'warga', supaya bisa dibuang sekaligus saat ganti akun atau keluar. */
export const kunciWarga = {
  semua: ['warga'] as const,
  sesi: ['warga', 'sesi'] as const,
  beranda: ['warga', 'beranda'] as const,
  riwayat: ['warga', 'permohonan'] as const,
  detail: (id: string) => ['warga', 'permohonan', id] as const,
}

export const masukWarga = (nik: string, pin: string) =>
  panggilApi('POST', '/warga/masuk', { skema: hasilMasukWargaSchema, body: { nik, pin }, sesi: 'warga' })

export const lupaPin = (nik: string) =>
  panggilApi('POST', '/warga/lupa-pin', { skema: hasilLupaPinSchema, body: { nik }, sesi: 'warga' })

export const ambilSesiWarga = (signal?: AbortSignal) =>
  panggilApi('GET', '/warga/sesi', { skema: sesiWargaSchema, signal, sesi: 'warga' })

/** Sesi tidak basi dengan sendirinya; diperbarui saat Akun disimpan. */
export const opsiSesiWarga = () =>
  queryOptions({ queryKey: kunciWarga.sesi, queryFn: ({ signal }) => ambilSesiWarga(signal), staleTime: Infinity })

export const ubahAkunWarga = (isian: UbahAkunWarga) =>
  panggilApi('PATCH', '/warga/akun', { skema: sesiWargaSchema, body: isian, sesi: 'warga' })

export const ambilBerandaWarga = (signal?: AbortSignal) =>
  panggilApi('GET', '/warga/beranda', { skema: berandaWargaSchema, signal, sesi: 'warga' })
export const opsiBerandaWarga = () =>
  queryOptions({ queryKey: kunciWarga.beranda, queryFn: ({ signal }) => ambilBerandaWarga(signal) })

export const daftarRiwayatWarga = (signal?: AbortSignal) =>
  panggilApi('GET', '/warga/permohonan', { skema: daftarSchema(ringkasPermohonanWargaSchema), signal, sesi: 'warga' })
export const opsiRiwayatWarga = () =>
  queryOptions({ queryKey: kunciWarga.riwayat, queryFn: async ({ signal }) => (await daftarRiwayatWarga(signal)).data })

export const ambilRiwayatWarga = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/warga/permohonan/${encodeURIComponent(id)}`, { skema: detailPermohonanWargaSchema, signal, sesi: 'warga' })
export const opsiDetailRiwayat = (id: string) =>
  queryOptions({ queryKey: kunciWarga.detail(id), queryFn: ({ signal }) => ambilRiwayatWarga(id, signal) })
