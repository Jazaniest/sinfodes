import { queryOptions } from '@tanstack/react-query'
import { tenggatDesaSchema } from '@/domain/kabupaten/tenggat'
import { panggilApi } from './client'

/** Tenggat laporan ke kabupaten di panel desa (SPEC-V0.2 §8.3 butir 4). */
export const kunciTenggatDesa = ['tenggat-laporan'] as const

const butirSchema = tenggatDesaSchema.shape.data.element

export const ambilTenggatDesa = (signal?: AbortSignal) => panggilApi('GET', '/tenggat-laporan', { skema: tenggatDesaSchema, signal })
export const opsiTenggatDesa = () => queryOptions({ queryKey: kunciTenggatDesa, queryFn: ({ signal }) => ambilTenggatDesa(signal) })

export const tandaiDikirim = (id: string, tanggal: string) =>
  panggilApi('POST', `/tenggat-laporan/${id}/kirim`, { skema: butirSchema, body: { tanggal } })
export const batalkanDikirim = (id: string) => panggilApi('DELETE', `/tenggat-laporan/${id}/kirim`, { skema: butirSchema })
