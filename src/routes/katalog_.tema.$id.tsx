import { createFileRoute, notFound } from '@tanstack/react-router'
import { opsiIdentitasPublik } from '@/api/publik'
import { SLUG_PRATINJAU_TEMA } from '@/domain/website/galeri-dasar'
import { adalahIdTema } from '@/domain/website/tema'
import { KatalogTemaRute } from '@/features/demo/KatalogTema'

// `katalog_` melepas halaman ini dari tata letak /katalog. Hanya ada di build demo, seperti katalog komponen.
export const Route = createFileRoute('/katalog_/tema/$id')({
  beforeLoad: ({ params }) => {
    if (import.meta.env.VITE_DEMO !== 'true' || !adalahIdTema(params.id)) throw notFound()
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(opsiIdentitasPublik(SLUG_PRATINJAU_TEMA)),
  component: KatalogTemaRute,
})
