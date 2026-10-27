import { queryOptions } from '@tanstack/react-query'
import { daftarSiaranDesaSchema, detailSiaranDesaSchema } from '@/domain/kabupaten/siaran'
import { panggilApi } from './client'

/** Siaran kabupaten di panel desa (SPEC-V0.2 §8.4). Setelah tindak lanjut berhasil, invalidasi `kunciSiaranDesa`. */
export const kunciSiaranDesa = ['siaran'] as const
export const kunciDetailSiaranDesa = (id: string) => ['siaran', id] as const

export const ambilSiaranDesa = (signal?: AbortSignal) => panggilApi('GET', '/siaran', { skema: daftarSiaranDesaSchema, signal })
export const opsiDaftarSiaranDesa = () => queryOptions({ queryKey: kunciSiaranDesa, queryFn: ({ signal }) => ambilSiaranDesa(signal) })
export const ambilDetailSiaranDesa = (id: string, signal?: AbortSignal) =>
  panggilApi('GET', `/siaran/${id}`, { skema: detailSiaranDesaSchema, signal })
export const opsiDetailSiaranDesa = (id: string) =>
  queryOptions({ queryKey: kunciDetailSiaranDesa(id), queryFn: ({ signal }) => ambilDetailSiaranDesa(id, signal) })
/** Dicatat sekali per desa (pembuka pertama). Dipanggil saat detail dibuka, bukan saat rutenya dipramuat. */
export const tandaiSiaranDibaca = (id: string) => panggilApi('POST', `/siaran/${id}/dibaca`, { skema: detailSiaranDesaSchema })
export const tandaiTindakLanjut = (id: string, catatan: string) =>
  panggilApi('POST', `/siaran/${id}/tindak-lanjut`, { skema: detailSiaranDesaSchema, body: { catatan } })
