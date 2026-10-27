import { queryOptions } from '@tanstack/react-query'
import type { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import { lencanaAdminSchema } from '@/domain/indeks/lencana'
import {
  agendaSchema, artikelSchema, fotoGaleriSchema, pengumumanSchema,
} from '@/domain/website/schema'
import { type Susunan } from '@/domain/website/susunan'
import type { TemaDasar } from '@/domain/website/tema'
import type { BlokHtml } from '@/domain/website/blok'
import { panggilApi } from './client'

/**
 * Skema tampilan website dimuat malas: `domain/website/situs` dan `domain/publik/schema` membawa skema semua jenis blok,
 * dan loader rute yang mengimpor berkas ini ada di JS awal (anggaran SPEC-DESAIN-FE 13.4).
 */
const dariSkemaSitus = <T>(ambil: (m: typeof import('@/domain/website/situs')) => z.ZodType<T>) => () =>
  import('@/domain/website/situs').then(ambil)
const skemaPratinjau = () => import('@/domain/publik/schema').then((m) => m.pratinjauSitusSchema)

const daftarArtikelSchema = daftarSchema(artikelSchema)
const daftarPengumumanSchema = daftarSchema(pengumumanSchema)
const daftarAgendaSchema = daftarSchema(agendaSchema)
const daftarGaleriSchema = daftarSchema(fotoGaleriSchema)

export const kunciWebsite = {
  semua: ['website'] as const,
  artikel: ['website', 'artikel'] as const,
  pengumuman: ['website', 'pengumuman'] as const,
  agenda: ['website', 'agenda'] as const,
  galeri: ['website', 'galeri'] as const,
  situs: ['website', 'situs'] as const,
  riwayat: ['website', 'riwayat'] as const,
  lencana: ['website', 'lencana'] as const,
}

export function daftarArtikel(signal?: AbortSignal) {
  return panggilApi('GET', '/website/artikel', { skema: daftarArtikelSchema, signal })
}
export const opsiArtikel = () => queryOptions({ queryKey: kunciWebsite.artikel, queryFn: ({ signal }) => daftarArtikel(signal) })

export function daftarPengumuman(signal?: AbortSignal) {
  return panggilApi('GET', '/website/pengumuman', { skema: daftarPengumumanSchema, signal })
}
export const opsiPengumuman = () => queryOptions({ queryKey: kunciWebsite.pengumuman, queryFn: ({ signal }) => daftarPengumuman(signal) })

export function daftarAgenda(signal?: AbortSignal) {
  return panggilApi('GET', '/website/agenda', { skema: daftarAgendaSchema, signal })
}
export const opsiAgenda = () => queryOptions({ queryKey: kunciWebsite.agenda, queryFn: ({ signal }) => daftarAgenda(signal) })

export function daftarGaleri(signal?: AbortSignal) {
  return panggilApi('GET', '/website/galeri', { skema: daftarGaleriSchema, signal })
}
export const opsiGaleri = () => queryOptions({ queryKey: kunciWebsite.galeri, queryFn: ({ signal }) => daftarGaleri(signal) })

export function ambilSitus(signal?: AbortSignal) {
  return panggilApi('GET', '/website/situs', { skema: dariSkemaSitus((m) => m.situsSchema), signal })
}
export const opsiSitus = () => queryOptions({ queryKey: kunciWebsite.situs, queryFn: ({ signal }) => ambilSitus(signal) })

/**
 * Simpan draf tampilan (tema, susunan, CSS kustom, dan Blok HTML 7G); website publik baru berubah setelah `terbitkan`.
 * `dasarId` = ID draf yang dimuat klien. `cssKustom` dan `blokHtml` bersifat pilihan; bila tidak dikirim, draf diisi kosong.
 */
export function simpanDraf(dasarId: string | null, isi: { tema: TemaDasar; susunan: Susunan; cssKustom?: string; blokHtml?: BlokHtml[] }) {
  return panggilApi('PUT', '/website/situs/draf', { skema: dariSkemaSitus((m) => m.versiSitusSchema), body: { dasarId, ...isi } })
}

/** Pratinjau satu halaman dari tema dan susunan yang sedang disunting (7F-2), lengkap dengan tanda blok kosong. */
export function pratinjauSitus(isi: { tema: TemaDasar; susunan: Susunan; cssKustom?: string; blokHtml?: BlokHtml[] }, halaman: string) {
  return panggilApi('POST', '/website/situs/pratinjau', { skema: skemaPratinjau, body: { ...isi, halaman } })
}

/** Nyalakan atau matikan tingkat Lanjut (7G): CSS kustom dan Blok HTML tampil di website publik bila aktif. */
export function aturLanjut(aktif: boolean) {
  return panggilApi('PUT', '/website/situs/lanjut', { skema: dariSkemaSitus((m) => m.lanjutSitusSchema), body: { aktif } })
}

/** Buang draf: kembali ke versi terbit. */
export function buangDraf() {
  return panggilApi('DELETE', '/website/situs/draf', { skema: dariSkemaSitus((m) => m.situsSchema) })
}

/** Terbitkan draf menjadi versi tayang; versi terbit lama masuk riwayat. */
export function terbitkan(catatan: string | null) {
  return panggilApi('POST', '/website/situs/terbitkan', { skema: dariSkemaSitus((m) => m.versiSitusSchema), body: { catatan } })
}

/** 20 terbitan terakhir (terbaru dulu), tanpa gambar data URL. */
export function daftarRiwayat(signal?: AbortSignal) {
  return panggilApi('GET', '/website/situs/riwayat', { skema: dariSkemaSitus((m) => m.riwayatSitusSchema), signal })
}
export const opsiRiwayat = () => queryOptions({ queryKey: kunciWebsite.riwayat, queryFn: ({ signal }) => daftarRiwayat(signal) })

/** Salin versi riwayat menjadi draf; website belum berubah sampai diterbitkan. */
export function pulihkanVersi(id: string) {
  return panggilApi('POST', `/website/situs/riwayat/${id}/pulihkan`, { skema: dariSkemaSitus((m) => m.versiSitusSchema) })
}

const daftarLencanaSchema = daftarSchema(lencanaAdminSchema)

/** Lencana juara desa, periode tutup terbaru dulu (SPEC-V0.2 §9.6). */
export function daftarLencana(signal?: AbortSignal) {
  return panggilApi('GET', '/website/lencana', { skema: daftarLencanaSchema, signal })
}
export const opsiLencanaWebsite = () => queryOptions({ queryKey: kunciWebsite.lencana, queryFn: ({ signal }) => daftarLencana(signal) })

/** Tampilkan atau sembunyikan satu lencana di website desa; halaman buktinya tetap terbuka. */
export function ubahTampilLencana(kode: string, tampil: boolean) {
  return panggilApi('PUT', `/website/lencana/${kode}`, { skema: lencanaAdminSchema, body: { tampil } })
}
