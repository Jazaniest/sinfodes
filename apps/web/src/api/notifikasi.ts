import { queryOptions } from '@tanstack/react-query'
import { kotakNotifikasiSchema } from '@/domain/notifikasi/schema'
import { panggilApi } from './client'

export const kunciNotifikasi = ['notifikasi'] as const

export function ambilNotifikasi(signal?: AbortSignal) {
  return panggilApi('GET', '/notifikasi', { skema: kotakNotifikasiSchema, signal })
}

/** Kotak notifikasi pengguna; angka belum dibaca dipakai menu Notifikasi (SPEC §5.2). */
export const opsiNotifikasi = () => queryOptions({ queryKey: kunciNotifikasi, queryFn: ({ signal }) => ambilNotifikasi(signal) })

/** Tandai sudah dibaca. `null` berarti semua milik pengguna. */
export function tandaiDibaca(ids: string[] | null) {
  return panggilApi('POST', '/notifikasi/tandai-dibaca', { skema: kotakNotifikasiSchema, body: { ids } })
}
