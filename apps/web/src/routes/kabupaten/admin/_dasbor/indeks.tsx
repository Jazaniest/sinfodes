import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { filterPapanIndeksSchema } from '@/domain/indeks/schema'
import { HalamanIndeks } from '@/features/kabupaten/indeks/HalamanIndeks'

/** Pilihan papan tinggal di URL; nilai yang tidak sah dibuang, jadi tautan lama tidak pernah menjadi halaman galat. */
export const Route = createFileRoute('/kabupaten/admin/_dasbor/indeks')({
  validateSearch: (cari: Record<string, unknown>) => {
    const hasil = filterPapanIndeksSchema.safeParse(cari)
    return hasil.success ? hasil.data : {}
  },
  search: { middlewares: [stripSearchParams({})] },
  component: HalamanIndeks,
})
