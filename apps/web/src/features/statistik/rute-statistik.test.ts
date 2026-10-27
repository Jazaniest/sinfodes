import type { SearchSchemaInput } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { Route } from '@/routes/admin/_panel/kependudukan/statistik'

const baca = (cari: Record<string, unknown>) => {
  const v = Route.options.validateSearch
  if (typeof v !== 'function') throw new Error('validateSearch Statistik bukan fungsi')
  // `SearchSchemaInput` hanya penanda tipe TanStack; nilainya objek parameter URL biasa.
  return v(cari as { dusun?: unknown } & SearchSchemaInput)
}

describe('?dusun= di Statistik (tahap 6D, fokus review 3)', () => {
  it('nomor dusun dari URL (teks) dan dari tautan di aplikasi (angka) sama-sama terbaca', () => {
    expect(baca({ dusun: '2' })).toEqual({ dusun: 2 })
    expect(baca({ dusun: 3 })).toEqual({ dusun: 3 })
  })
  it('nilai lain diabaikan', () => {
    for (const dusun of ['0', '-1', '1.5', 'abc', '', undefined]) expect(baca({ dusun }), String(dusun)).toEqual({})
  })
})
