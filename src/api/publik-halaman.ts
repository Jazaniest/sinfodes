import { queryOptions } from '@tanstack/react-query'
import { potensiPublikSchema } from '@/domain/publik/potensi'
import { profilPublikSchema } from '@/domain/publik/profil'
import { statistikPublikSchema } from '@/domain/publik/statistik'
import { transparansiPublikSchema } from '@/domain/publik/transparansi'
import { panggilApi } from './client'
import { jalurPublik, kunciPublik } from './publik'

// Halaman Profil, Transparansi, Statistik, dan Potensi (SPEC §9). Dipisah dari publik.ts supaya skemanya hanya dimuat
// rute halamannya, tidak ikut JS awal Beranda (SPEC §13.4).

export const ambilProfilPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalurPublik(slug, '/profil'), { skema: profilPublikSchema, signal, sesi: null })
export const opsiProfilPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.profil(slug), queryFn: ({ signal }) => ambilProfilPublik(slug, signal) })

export const ambilTransparansiPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalurPublik(slug, '/transparansi'), { skema: transparansiPublikSchema, signal, sesi: null })
export const opsiTransparansiPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.transparansi(slug), queryFn: ({ signal }) => ambilTransparansiPublik(slug, signal) })

export const ambilStatistikPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalurPublik(slug, '/statistik'), { skema: statistikPublikSchema, signal, sesi: null })
export const opsiStatistikPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.statistik(slug), queryFn: ({ signal }) => ambilStatistikPublik(slug, signal) })

export const ambilPotensiPublik = (slug: string, signal?: AbortSignal) =>
  panggilApi('GET', jalurPublik(slug, '/potensi'), { skema: potensiPublikSchema, signal, sesi: null })
export const opsiPotensiPublik = (slug: string) =>
  queryOptions({ queryKey: kunciPublik.potensi(slug), queryFn: ({ signal }) => ambilPotensiPublik(slug, signal) })
