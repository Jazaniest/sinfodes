import { queryOptions } from '@tanstack/react-query'
import { langgananDesaSchema, tagihanCetakSchema } from '@/domain/langganan/schema'
import { kwitansiSchema, tagihanSchema, type IsianBukti } from '@/domain/langganan/tagihan'
import { panggilApi } from './client'

/** Langganan desa sesi (SPEC-V0.2 §10). Setelah unggah bukti berhasil, invalidasi `kunciLangganan`. */
export const kunciLangganan = ['langganan'] as const
export const kunciTagihanCetak = (id: string) => ['langganan', 'tagihan', id] as const

export const ambilLangganan = (signal?: AbortSignal) => panggilApi('GET', '/langganan', { skema: langgananDesaSchema, signal })
export const opsiLangganan = () => queryOptions({ queryKey: kunciLangganan, queryFn: ({ signal }) => ambilLangganan(signal) })

export const ambilTagihanCetak = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/langganan/tagihan/${encodeURIComponent(id)}`, { skema: tagihanCetakSchema, signal })
export const opsiTagihanCetak = (id: string) =>
  queryOptions({ queryKey: kunciTagihanCetak(id), queryFn: ({ signal }) => ambilTagihanCetak(id, signal) })

export const kunciKwitansiDesa = (id: string) => ['langganan', 'kwitansi', id] as const
export const ambilKwitansiDesa = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/langganan/tagihan/${encodeURIComponent(id)}/kwitansi`, { skema: kwitansiSchema, signal })
export const opsiKwitansiDesa = (id: string) =>
  queryOptions({ queryKey: kunciKwitansiDesa(id), queryFn: ({ signal }) => ambilKwitansiDesa(id, signal) })

/** Kirim bukti transfer: isian sebagai JSON di `data`, berkasnya di `bukti` (pola yang sama dengan unggahan lain). */
export function kirimBukti(id: string, isian: IsianBukti, berkas: File | null) {
  const isi = new FormData()
  isi.append('data', JSON.stringify(isian))
  if (berkas) isi.append('bukti', berkas)
  return panggilApi('POST', `/langganan/tagihan/${encodeURIComponent(id)}/bukti`, { skema: tagihanSchema, body: isi })
}
