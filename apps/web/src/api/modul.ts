import { queryOptions } from '@tanstack/react-query'
import { modulDesaSchema, type ModulDesa } from '@/domain/pengaturan/modul'
import { panggilApi } from './client'

export const kunciModul = ['pengaturan', 'modul'] as const

/** Modul desa yang menyala (SPEC-V0.2 12.3); hanya Sekretaris Desa yang membacanya lewat sini, peran lain lewat sesi. */
export const ambilModul = (signal?: AbortSignal) => panggilApi('GET', '/pengaturan/modul', { skema: modulDesaSchema, signal })

export const opsiModul = () => queryOptions({ queryKey: kunciModul, queryFn: ({ signal }) => ambilModul(signal) })

/** Menyalakan atau mematikan modul. Data modul yang dimatikan tidak dihapus. */
export const ubahModul = (modul: ModulDesa) => panggilApi('PUT', '/pengaturan/modul', { skema: modulDesaSchema, body: modul })
