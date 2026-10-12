import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import { barisPengaduanSchema, pengaduanSchema } from '@/domain/pengaduan/schema'
import { hasilKirimPermohonanSchema, jenisSuratWargaSchema, type KirimPermohonanWarga } from '@/domain/warga/ajukan'
import { keluargaWargaSchema, laporanWargaSchema, type KirimLaporanWarga } from '@/domain/warga/keluarga'
import { hasilKirimPengaduanSchema, type KirimPengaduanWarga } from '@/domain/warga/pengaduan'
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
  jenisSurat: ['warga', 'jenis-surat'] as const,
  keluarga: ['warga', 'keluarga'] as const,
  pengaduan: ['warga', 'pengaduan'] as const,
  detailPengaduan: (id: string) => ['warga', 'pengaduan', id] as const,
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

export const daftarJenisSuratWarga = (signal?: AbortSignal) =>
  panggilApi('GET', '/warga/jenis-surat', { skema: z.array(jenisSuratWargaSchema), signal, sesi: 'warga' })
export const opsiJenisSuratWarga = () =>
  queryOptions({ queryKey: kunciWarga.jenisSurat, queryFn: ({ signal }) => daftarJenisSuratWarga(signal) })

/** Permohonan beserta foto lampirannya (sudah dikecilkan), urut sesuai `data.lampiran`. */
export function kirimPermohonanWarga(data: KirimPermohonanWarga, lampiran: readonly File[]) {
  const isi = new FormData()
  isi.append('data', JSON.stringify(data))
  for (const f of lampiran) isi.append('lampiran', f)
  return panggilApi('POST', '/warga/permohonan', { skema: hasilKirimPermohonanSchema, body: isi, sesi: 'warga' })
}

export const ambilKeluargaWarga = (signal?: AbortSignal) =>
  panggilApi('GET', '/warga/keluarga', { skema: keluargaWargaSchema, signal, sesi: 'warga' })
export const opsiKeluargaWarga = () =>
  queryOptions({ queryKey: kunciWarga.keluarga, queryFn: ({ signal }) => ambilKeluargaWarga(signal) })

/** Laporan perbaikan data; foto dokumen (sudah dikecilkan) boleh kosong. */
export function kirimLaporanWarga(data: KirimLaporanWarga, foto: File | null) {
  const isi = new FormData()
  isi.append('data', JSON.stringify(data))
  if (foto) isi.append('foto', foto)
  return panggilApi('POST', '/warga/laporan-data', { skema: laporanWargaSchema, body: isi, sesi: 'warga' })
}

export const daftarPengaduanWarga = (signal?: AbortSignal) =>
  panggilApi('GET', '/warga/pengaduan', { skema: daftarSchema(barisPengaduanSchema), signal, sesi: 'warga' })
export const opsiPengaduanWarga = () =>
  queryOptions({ queryKey: kunciWarga.pengaduan, queryFn: async ({ signal }) => (await daftarPengaduanWarga(signal)).data })

/** Pengaduan baru; foto (sudah dikecilkan) boleh kosong. */
export function kirimPengaduanWarga(data: KirimPengaduanWarga, foto: File | null) {
  const isi = new FormData()
  isi.append('data', JSON.stringify(data))
  if (foto) isi.append('foto', foto)
  return panggilApi('POST', '/warga/pengaduan', { skema: hasilKirimPengaduanSchema, body: isi, sesi: 'warga' })
}

export const ambilPengaduanWarga = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/warga/pengaduan/${encodeURIComponent(id)}`, { skema: pengaduanSchema, signal, sesi: 'warga' })
export const opsiDetailPengaduanWarga = (id: string) =>
  queryOptions({ queryKey: kunciWarga.detailPengaduan(id), queryFn: ({ signal }) => ambilPengaduanWarga(id, signal) })

export const balasPengaduanWarga = (id: string, isi: string) =>
  panggilApi('POST', `/warga/pengaduan/${encodeURIComponent(id)}/balasan`, { skema: pengaduanSchema, body: { isi }, sesi: 'warga' })
