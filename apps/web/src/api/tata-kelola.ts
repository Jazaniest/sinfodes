import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { daftarSchema } from '@/domain/api'
import { asetSchema, type FilterAset } from '@/domain/aset/schema'
import { pengurusSchema } from '@/domain/lembaga/schema'
import { lapisanPetaSchema } from '@/domain/peta/schema'
import { panggilApi } from './client'

const daftarAsetSchema = daftarSchema(asetSchema)
const daftarPengurusSchema = z.array(pengurusSchema)

export const kunciTataKelola = {
  aset: (f: Partial<FilterAset>) => ['aset', f] as const,
  lembaga: ['lembaga'] as const,
  peta: ['peta'] as const,
}

export function daftarAset(filter: Partial<FilterAset>, signal?: AbortSignal) {
  return panggilApi('GET', '/aset', { skema: daftarAsetSchema, query: filter, signal })
}

export const opsiAset = (filter: Partial<FilterAset>) =>
  queryOptions({ queryKey: kunciTataKelola.aset(filter), queryFn: ({ signal }) => daftarAset(filter, signal) })

export function daftarLembaga(signal?: AbortSignal) {
  return panggilApi('GET', '/lembaga', { skema: daftarPengurusSchema, signal })
}

export const opsiLembaga = () => queryOptions({ queryKey: kunciTataKelola.lembaga, queryFn: ({ signal }) => daftarLembaga(signal) })

export function ambilLapisanPeta(signal?: AbortSignal) {
  return panggilApi('GET', '/peta/lapisan', { skema: lapisanPetaSchema, signal })
}

export const opsiLapisanPeta = () => queryOptions({ queryKey: kunciTataKelola.peta, queryFn: ({ signal }) => ambilLapisanPeta(signal) })
