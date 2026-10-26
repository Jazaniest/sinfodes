import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import { jenisDenganPakaiSchema, jenisSuratSchema, type StatusJenis, type TambahJenis } from '@/domain/surat/jenis'
import {
  barisPermohonanSchema, detailPermohonanSchema, jumlahPermohonanSchema, saranSuratSchema,
  type AksiSurat, type BuatPermohonan, type FilterPermohonan, type PeriodePermohonan,
} from '@/domain/surat/permohonan'
import { detailJenisSuratSchema, type UbahJenisSurat } from '@/domain/surat/ubah-jenis'
import { panggilApi } from './client'

const daftarJenisSchema = daftarSchema(jenisDenganPakaiSchema)
const daftarPermohonanSchema = daftarSchema(barisPermohonanSchema)

export const kunciSurat = {
  jenis: ['jenis-surat'] as const,
  detailJenis: (id: string) => ['jenis-surat', id] as const,
  semua: ['permohonan'] as const,
  daftar: (filter: Partial<FilterPermohonan>) => ['permohonan', 'daftar', filter] as const,
  /** Kata cari hanya ada di memori (kunci cache), tidak pernah di URL. */
  cari: (kata: string, jenis: string | null) => ['permohonan', 'cari', kata, jenis] as const,
  jumlah: (periode: PeriodePermohonan, jenis: string | null) => ['permohonan', 'jumlah', periode, jenis] as const,
  detail: (id: string) => ['permohonan', 'detail', id] as const,
  antrian: ['permohonan', 'antrian-ttd'] as const,
  penduduk: (id: string) => ['permohonan', 'penduduk', id] as const,
  saran: (jenis: string, pemohon: string | null, subjek: string | null) => ['permohonan', 'saran', jenis, pemohon, subjek] as const,
}

/** Tanpa `status`, semua jenis desa (aktif, dihentikan, dan diarsipkan). */
export function daftarJenisSurat(signal?: AbortSignal, status?: StatusJenis) {
  return panggilApi('GET', '/jenis-surat', { skema: daftarJenisSchema, query: { status }, signal })
}

const hapusSchema = z.object({ id: z.string() })

/** Jenis surat buatan desa, kosong atau salinan jenis lain; mati sampai desa menyalakannya (SPEC-V0.2 12.1). */
export function tambahJenisSurat(masukan: TambahJenis) {
  return panggilApi('POST', '/jenis-surat', { skema: jenisSuratSchema, body: masukan })
}

/** Hanya jenis buatan desa yang belum pernah dipakai; yang sudah dipakai ditolak dan harus diarsipkan. */
export function hapusJenisSurat(id: string) {
  return panggilApi('DELETE', `/jenis-surat/${encodeURIComponent(id)}`, { skema: hapusSchema })
}

export function arsipkanJenisSurat(id: string) {
  return panggilApi('POST', `/jenis-surat/${encodeURIComponent(id)}/arsipkan`, { skema: jenisSuratSchema })
}

/** Mengosongkan arsip; jenisnya tetap mati sampai desa menyalakannya. */
export function aktifkanLagiJenisSurat(id: string) {
  return panggilApi('POST', `/jenis-surat/${encodeURIComponent(id)}/aktifkan-lagi`, { skema: jenisSuratSchema })
}

export const opsiJenisSurat = () =>
  queryOptions({ queryKey: kunciSurat.jenis, queryFn: ({ signal }) => daftarJenisSurat(signal), staleTime: 5 * 60_000 })

export function ambilJenisSurat(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/jenis-surat/${encodeURIComponent(id)}`, { skema: detailJenisSuratSchema, signal })
}

/** Jenis surat beserta contoh untuk pratinjau halaman ubah (SPEC §7.4 layar 6). */
export const opsiDetailJenisSurat = (id: string) =>
  queryOptions({ queryKey: kunciSurat.detailJenis(id), queryFn: ({ signal }) => ambilJenisSurat(id, signal) })

/** Ubah sebagian jenis surat: saklar di daftar, atau formulir halaman ubah. */
export function ubahJenisSurat(id: string, ubah: UbahJenisSurat) {
  return panggilApi('PATCH', `/jenis-surat/${encodeURIComponent(id)}`, { skema: detailJenisSuratSchema, body: ubah })
}

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

/** Surat dari loket (SPEC §7.4 layar 2): Simpan draf (Diproses) atau langsung diajukan tanda tangan. */
export function buatPermohonan(masukan: BuatPermohonan) {
  return panggilApi('POST', '/permohonan', { skema: detailPermohonanSchema, body: masukan })
}

export function ambilAntrianTtd(signal?: AbortSignal) {
  return panggilApi('GET', '/permohonan/antrian-ttd', { skema: z.array(detailPermohonanSchema), signal })
}

/** Surat yang menunggu tanda tangan pengguna, terlama dulu (SPEC §7.4 layar 4). */
export const opsiAntrianTtd = () => queryOptions({ queryKey: kunciSurat.antrian, queryFn: ({ signal }) => ambilAntrianTtd(signal) })

export function daftarSuratPenduduk(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/permohonan/penduduk/${encodeURIComponent(id)}`, { skema: daftarPermohonanSchema, signal })
}

/** Semua surat seorang penduduk, sebagai pemohon atau yang diterangkan; terbaru dulu (SPEC §6.2, §6.3). */
export const opsiSuratPenduduk = (id: string) =>
  queryOptions({ queryKey: kunciSurat.penduduk(id), queryFn: ({ signal }) => daftarSuratPenduduk(id, signal) })

export function ambilSaranSurat(jenis: string, pemohon: string | null, subjek: string | null, signal?: AbortSignal) {
  return panggilApi('GET', '/permohonan/saran', { skema: saranSuratSchema, query: { jenis, pemohon, subjek }, signal })
}

/** Isian awal dari mutasi yang baru dicatat (SPEC §6.6). */
export const opsiSaranSurat = (jenis: string, pemohon: string | null, subjek: string | null) =>
  queryOptions({
    queryKey: kunciSurat.saran(jenis, pemohon, subjek),
    queryFn: ({ signal }) => ambilSaranSurat(jenis, pemohon, subjek, signal),
  })
