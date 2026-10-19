import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { danaDesaSchema } from '@/domain/kabupaten/dana-desa'
import { dataGabunganSchema } from '@/domain/kabupaten/data-gabungan'
import { daftarLaporanSchema, laporanBulananSchema } from '@/domain/kabupaten/laporan'
import { pemantauanSchema } from '@/domain/kabupaten/pemantauan'
import { petaKabupatenSchema } from '@/domain/kabupaten/peta'
import { daftarTenggatSchema, detailTenggatSchema, ringkasTenggatSchema, type IsianTenggat } from '@/domain/kabupaten/tenggat'
import { daftarPenggunaKabupatenSchema, type TambahPenggunaKabupaten, type UbahPenggunaKabupaten } from '@/domain/kabupaten/pengguna'
import { portalKabupatenSchema } from '@/domain/kabupaten/portal'
import { penggunaKabupatenSchema, ringkasanKabupatenSchema, sesiKabupatenSchema } from '@/domain/kabupaten/schema'
import { panggilApi } from './client'

/** Dasbor kabupaten (SPEC-V0.2 §8). Semua panggilan memakai sesi kabupaten, kecuali portal publik. */
export const kunciKabupaten = {
  semua: ['kabupaten'] as const,
  sesi: ['kabupaten', 'sesi'] as const,
  ringkasan: ['kabupaten', 'ringkasan'] as const,
  pemantauan: ['kabupaten', 'pemantauan'] as const,
  pengguna: ['kabupaten', 'pengguna'] as const,
  portal: ['kabupaten', 'portal'] as const,
  danaDesa: ['kabupaten', 'dana-desa'] as const,
  tenggat: ['kabupaten', 'tenggat'] as const,
  detailTenggat: (id: string) => ['kabupaten', 'tenggat', id] as const,
  dataGabungan: ['kabupaten', 'data-gabungan'] as const,
  peta: ['kabupaten', 'peta'] as const,
  laporan: ['kabupaten', 'laporan'] as const,
  laporanBulan: (bulan: string) => ['kabupaten', 'laporan', bulan] as const,
}

export const hasilMasukKabupatenSchema = z.object({ token: z.string(), sesi: sesiKabupatenSchema })

export const masukKabupaten = (email: string, kataSandi: string) =>
  panggilApi('POST', '/kabupaten/sesi/masuk', { skema: hasilMasukKabupatenSchema, body: { email, kataSandi }, sesi: 'kabupaten' })

export const ambilSesiKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/sesi', { skema: sesiKabupatenSchema, signal, sesi: 'kabupaten' })

export const keluarKabupaten = () => panggilApi('POST', '/kabupaten/sesi/keluar', { skema: z.undefined(), sesi: 'kabupaten' })

/** Sesi kabupaten tidak basi dengan sendirinya; cache dibersihkan saat masuk dan keluar. */
export const opsiSesiKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.sesi, queryFn: ({ signal }) => ambilSesiKabupaten(signal), staleTime: Infinity })

export const ambilRingkasanKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/ringkasan', { skema: ringkasanKabupatenSchema, signal, sesi: 'kabupaten' })
export const opsiRingkasanKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.ringkasan, queryFn: ({ signal }) => ambilRingkasanKabupaten(signal) })

export const ambilPemantauanKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/pemantauan', { skema: pemantauanSchema, signal, sesi: 'kabupaten' })
export const opsiPemantauanKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.pemantauan, queryFn: ({ signal }) => ambilPemantauanKabupaten(signal) })

export const ambilDanaDesaKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/dana-desa', { skema: danaDesaSchema, signal, sesi: 'kabupaten' })
export const opsiDanaDesaKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.danaDesa, queryFn: ({ signal }) => ambilDanaDesaKabupaten(signal) })

export const ambilDataGabungan = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/data-gabungan', { skema: dataGabunganSchema, signal, sesi: 'kabupaten' })
export const opsiDataGabungan = () =>
  queryOptions({ queryKey: kunciKabupaten.dataGabungan, queryFn: ({ signal }) => ambilDataGabungan(signal) })

export const ambilPetaKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/peta', { skema: petaKabupatenSchema, signal, sesi: 'kabupaten' })
export const opsiPetaKabupaten = () => queryOptions({ queryKey: kunciKabupaten.peta, queryFn: ({ signal }) => ambilPetaKabupaten(signal) })

/** Laporan bulanan (SPEC-V0.2 §8.3 butir 7): bulan yang sudah tutup. */
export const daftarLaporanBulanan = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/laporan', { skema: daftarLaporanSchema, signal, sesi: 'kabupaten' })
export const opsiDaftarLaporan = () =>
  queryOptions({ queryKey: kunciKabupaten.laporan, queryFn: ({ signal }) => daftarLaporanBulanan(signal) })
export const ambilLaporanBulanan = (bulan: string, signal?: AbortSignal) =>
  panggilApi('GET', `/kabupaten/laporan/${bulan}`, { skema: laporanBulananSchema, signal, sesi: 'kabupaten' })
export const opsiLaporanBulanan = (bulan: string) =>
  queryOptions({ queryKey: kunciKabupaten.laporanBulan(bulan), queryFn: ({ signal }) => ambilLaporanBulanan(bulan, signal) })

/** Tenggat laporan Dana Desa (SPEC-V0.2 §8.3 butir 4): semua akun melihat, Admin mengatur. */
export const daftarTenggatKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/tenggat', { skema: daftarTenggatSchema, signal, sesi: 'kabupaten' })
export const opsiTenggatKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.tenggat, queryFn: ({ signal }) => daftarTenggatKabupaten(signal) })
export const ambilDetailTenggat = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/kabupaten/tenggat/${id}`, { skema: detailTenggatSchema, signal, sesi: 'kabupaten' })
export const opsiDetailTenggat = (id: string) =>
  queryOptions({ queryKey: kunciKabupaten.detailTenggat(id), queryFn: ({ signal }) => ambilDetailTenggat(id, signal) })
export const tambahTenggat = (isian: IsianTenggat) =>
  panggilApi('POST', '/kabupaten/tenggat', { skema: ringkasTenggatSchema, body: isian, sesi: 'kabupaten' })
export const ubahTenggat = (id: string, isian: IsianTenggat) =>
  panggilApi('PATCH', `/kabupaten/tenggat/${id}`, { skema: ringkasTenggatSchema, body: isian, sesi: 'kabupaten' })
export const hapusTenggat = (id: string) => panggilApi('DELETE', `/kabupaten/tenggat/${id}`, { skema: z.undefined(), sesi: 'kabupaten' })

export const daftarPenggunaKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/pengguna', { skema: daftarPenggunaKabupatenSchema, signal, sesi: 'kabupaten' })
export const opsiPenggunaKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.pengguna, queryFn: ({ signal }) => daftarPenggunaKabupaten(signal) })
export const tambahPenggunaKabupaten = (isian: TambahPenggunaKabupaten) =>
  panggilApi('POST', '/kabupaten/pengguna', { skema: penggunaKabupatenSchema, body: isian, sesi: 'kabupaten' })
export const ubahPenggunaKabupaten = (id: string, isian: UbahPenggunaKabupaten) =>
  panggilApi('PATCH', `/kabupaten/pengguna/${id}`, { skema: penggunaKabupatenSchema, body: isian, sesi: 'kabupaten' })

/** Portal publik (SPEC-V0.2 §8.2): tanpa sesi, kabupaten dari alamat. */
export const ambilPortalKabupaten = (signal?: AbortSignal) =>
  panggilApi('GET', '/kabupaten/portal', { skema: portalKabupatenSchema, signal, sesi: null })
export const opsiPortalKabupaten = () =>
  queryOptions({ queryKey: kunciKabupaten.portal, queryFn: ({ signal }) => ambilPortalKabupaten(signal) })
