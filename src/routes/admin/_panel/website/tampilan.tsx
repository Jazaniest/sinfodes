import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import { HalamanTampilan } from '@/features/website/halaman'

export type CariTampilan = { bagian: 'dasar' | 'susunan'; halaman: string }
const BAWAAN: CariTampilan = { bagian: 'dasar', halaman: 'beranda' }

/** Tampilan website: `bagian` memilih sub-tab (Dasar/Susunan), `halaman` memilih halaman yang disusun di sub-tab Susunan. */
export const Route = createFileRoute('/admin/_panel/website/tampilan')({
  validateSearch: (cari: Partial<CariTampilan> & SearchSchemaInput): CariTampilan => ({
    bagian: cari.bagian === 'susunan' ? 'susunan' : 'dasar',
    halaman: typeof cari.halaman === 'string' && cari.halaman !== '' ? cari.halaman : BAWAAN.halaman,
  }),
  search: { middlewares: [stripSearchParams(BAWAAN)] },
  component: HalamanTampilan,
})
