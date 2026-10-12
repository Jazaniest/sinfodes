import { queryOptions } from '@tanstack/react-query'
import { apbdesSchema } from '@/domain/keuangan/schema'
import { panggilApi } from './client'

export const kunciKeuangan = {
  semua: ['keuangan'] as const,
  apbdes: (tahun?: number) => ['keuangan', 'apbdes', tahun ?? 'terbaru'] as const,
}

export function ambilApbdes(tahun?: number, signal?: AbortSignal) {
  return panggilApi('GET', '/keuangan/apbdes', { skema: apbdesSchema, query: { tahun }, signal })
}

export const opsiApbdes = (tahun?: number) => queryOptions({ queryKey: kunciKeuangan.apbdes(tahun), queryFn: ({ signal }) => ambilApbdes(tahun, signal) })

/** Sinkron Siskeudes (tiruan, khusus Kaur Keuangan). */
export function sinkronSiskeudes() {
  return panggilApi('POST', '/keuangan/sinkron-siskeudes', { skema: apbdesSchema })
}
