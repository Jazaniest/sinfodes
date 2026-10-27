import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import { bantuanKeluargaSchema, penerimaBansosSchema, ringkasProgramSchema, type FilterPenerima } from '@/domain/bansos/schema'
import { panggilApi } from './client'

const daftarProgramSchema = daftarSchema(ringkasProgramSchema)
const daftarPenerimaSchema = daftarSchema(penerimaBansosSchema)

export const kunciBansos = {
  semua: ['bansos'] as const,
  program: ['bansos', 'program'] as const,
  detail: (id: string) => ['bansos', 'program', id] as const,
  penerima: (id: string, f: Partial<FilterPenerima>) => ['bansos', 'penerima', id, f] as const,
  keluarga: (id: string) => ['bansos', 'keluarga', id] as const,
}

export function daftarProgramBansos(signal?: AbortSignal) {
  return panggilApi('GET', '/bansos/program', { skema: daftarProgramSchema, signal })
}

export const opsiProgramBansos = () => queryOptions({ queryKey: kunciBansos.program, queryFn: ({ signal }) => daftarProgramBansos(signal) })

export function ambilProgramBansos(id: string, signal?: AbortSignal) {
  return panggilApi('GET', `/bansos/program/${id}`, { skema: ringkasProgramSchema, signal })
}

export const opsiDetailProgram = (id: string) =>
  queryOptions({ queryKey: kunciBansos.detail(id), queryFn: ({ signal }) => ambilProgramBansos(id, signal) })

export function daftarPenerimaBansos(id: string, filter: Partial<FilterPenerima>, signal?: AbortSignal) {
  return panggilApi('GET', `/bansos/program/${id}/penerima`, { skema: daftarPenerimaSchema, query: filter, signal })
}

export const opsiPenerimaBansos = (id: string, filter: Partial<FilterPenerima>) =>
  queryOptions({ queryKey: kunciBansos.penerima(id, filter), queryFn: ({ signal }) => daftarPenerimaBansos(id, filter, signal) })

export function ambilBantuanKeluarga(keluargaId: string, signal?: AbortSignal) {
  return panggilApi('GET', `/bansos/keluarga/${keluargaId}`, { skema: bantuanKeluargaSchema, signal })
}

export const opsiBantuanKeluarga = (keluargaId: string) =>
  queryOptions({ queryKey: kunciBansos.keluarga(keluargaId), queryFn: ({ signal }) => ambilBantuanKeluarga(keluargaId, signal) })
