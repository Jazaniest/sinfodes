import { queryOptions } from '@tanstack/react-query'
import { tataLetakSuratSchema, type TataLetakSurat } from '@/domain/surat/tata-letak'
import { panggilApi } from './client'

export const kunciTataLetak = ['surat', 'tata-letak'] as const

/** Tata letak surat milik desa (SPEC-V0.2 12.2); pengecualian per jenis ada di jenis suratnya. */
export const ambilTataLetak = (signal?: AbortSignal) => panggilApi('GET', '/surat/tata-letak', { skema: tataLetakSuratSchema, signal })

export const opsiTataLetak = () => queryOptions({ queryKey: kunciTataLetak, queryFn: ({ signal }) => ambilTataLetak(signal) })

/** Surat yang sudah terbit tidak berubah; hanya surat yang ditandatangani sesudahnya memakai tata letak baru. */
export const simpanTataLetak = (tataLetak: TataLetakSurat) =>
  panggilApi('PUT', '/surat/tata-letak', { skema: tataLetakSuratSchema, body: tataLetak })
