import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import {
  artikelPublikSchema, berandaPublikSchema, hasilVerifikasiSchema, identitasPublikSchema, kreditFotoPublikSchema,
  layananPublikSchema, ringkasArtikelSchema,
} from '@/domain/publik/schema'
import type { KategoriArtikel } from '@/domain/website/schema'
import { panggilApi } from './client'

/** Website publik tidak memakai sesi apa pun: token panel admin dan warga tidak pernah terkirim. */
const jalur = (slug: string, sisa = '') => `/publik/${encodeURIComponent(slug)}${sisa}`

export const kunciPublik = {
  semua: ['publik'] as const,
  identitas: (slug: string) => ['publik', slug, 'identitas'] as const,
  beranda: (slug: string) => ['publik', slug, 'beranda'] as const,
  kabar: (slug: string, kategori: KategoriArtikel | null) => ['publik', slug, 'kabar', kategori ?? 'semua'] as const,
  artikel: (slug: string, artikel: string) => ['publik', slug, 'artikel', artikel] as const,
  layanan: (slug: string) => ['publik', slug, 'layanan'] as const,
  kreditFoto: (slug: string) => ['publik', slug, 'kredit-foto'] as const,
  verifikasi: (slug: string, kode: string) => ['publik', slug, 'verifikasi', kode] as const,
}

export const ambilIdentitasPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalur(slug), { skema: identitasPublikSchema, signal, sesi: null })
/** Identitas jarang berubah; dimuat loader rute sekali untuk semua halaman website. */
export const opsiIdentitasPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.identitas(slug), queryFn: ({ signal }) => ambilIdentitasPublik(slug, signal), staleTime: 5 * 60_000 })

export const ambilBerandaPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalur(slug, '/beranda'), { skema: berandaPublikSchema, signal, sesi: null })
export const opsiBerandaPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.beranda(slug), queryFn: ({ signal }) => ambilBerandaPublik(slug, signal) })

export const daftarKabarPublik = (slug: string, kategori: KategoriArtikel | null, signal?: AbortSignal) =>
  panggilApi('GET', jalur(slug, '/kabar'), { skema: daftarSchema(ringkasArtikelSchema), query: { kategori }, signal, sesi: null })
export const opsiKabarPublik = (slug: string, kategori: KategoriArtikel | null) =>
  queryOptions({
    queryKey: kunciPublik.kabar(slug, kategori),
    queryFn: async ({ signal }) => (await daftarKabarPublik(slug, kategori, signal)).data,
  })

export const ambilArtikelPublik = (slug: string, artikel: string, signal?: AbortSignal) =>
  panggilApi('GET', jalur(slug, `/kabar/${encodeURIComponent(artikel)}`), { skema: artikelPublikSchema, signal, sesi: null })
export const opsiArtikelPublik = (slug: string, artikel: string) =>
  queryOptions({ queryKey: kunciPublik.artikel(slug, artikel), queryFn: ({ signal }) => ambilArtikelPublik(slug, artikel, signal) })

export const ambilLayananPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalur(slug, '/layanan'), { skema: layananPublikSchema, signal, sesi: null })
export const opsiLayananPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.layanan(slug), queryFn: ({ signal }) => ambilLayananPublik(slug, signal) })

export const ambilKreditFotoPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalur(slug, '/kredit-foto'), { skema: z.array(kreditFotoPublikSchema), signal, sesi: null })
export const opsiKreditFotoPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.kreditFoto(slug), queryFn: ({ signal }) => ambilKreditFotoPublik(slug, signal) })

export const verifikasiSurat = (slug: string, kode: string) =>
  panggilApi('POST', jalur(slug, '/verifikasi'), { skema: hasilVerifikasiSchema, body: { kode }, sesi: null })
/** Hasil per kode disimpan di cache: membuka ulang kode yang sama tidak menambah percobaan (fokus review 3). */
export const opsiVerifikasi = (slug: string, kode: string) =>
  queryOptions({ queryKey: kunciPublik.verifikasi(slug, kode), queryFn: () => verifikasiSurat(slug, kode), retry: false, staleTime: Infinity })
