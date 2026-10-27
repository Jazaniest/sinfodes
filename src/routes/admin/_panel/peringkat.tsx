import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { filterPeringkatSchema } from '@/domain/indeks/peringkat-desa'
import { HalamanPeringkat } from '@/features/peringkat/HalamanPeringkat'

/** Pilihan musim dan periode tinggal di URL; nilai yang tidak sah dibuang, jadi tautan lama tidak pernah menjadi halaman galat. */
export const Route = createFileRoute('/admin/_panel/peringkat')({
  validateSearch: (cari: Record<string, unknown>) => {
    const hasil = filterPeringkatSchema.safeParse(cari)
    return hasil.success ? hasil.data : {}
  },
  search: { middlewares: [stripSearchParams({})] },
  component: HalamanPeringkat,
})
