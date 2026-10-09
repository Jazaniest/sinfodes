import { queryOptions } from '@tanstack/react-query'
import { statistikPendudukSchema } from '@/domain/statistik/penduduk'
import { panggilApi } from './client'

export const kunciStatistik = {
  semua: ['statistik'] as const,
  penduduk: (dusun: number | null) => ['statistik', 'penduduk', dusun] as const,
}

/** `dusun`: nomor dusun; null = seluruh desa. Kepala Dusun selalu mendapat dusunnya. */
export function ambilStatistikPenduduk(dusun: number | null, signal?: AbortSignal) {
  return panggilApi('GET', '/statistik/penduduk', { skema: statistikPendudukSchema, query: { dusun }, signal })
}

export const opsiStatistikPenduduk = (dusun: number | null) =>
  queryOptions({ queryKey: kunciStatistik.penduduk(dusun), queryFn: ({ signal }) => ambilStatistikPenduduk(dusun, signal) })
