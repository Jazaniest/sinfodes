import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { HalamanProfilPenduduk } from '@/features/penduduk/HalamanProfilPenduduk'
import { bacaTawaranSurat, type TawaranSurat } from '@/features/penduduk/tawaran-surat'

export const Route = createFileRoute('/admin/_panel/kependudukan/penduduk/$id')({
  // `?surat=` hanya untuk tawaran setelah mutasi; nilai lain diabaikan.
  validateSearch: (cari: { surat?: TawaranSurat } & SearchSchemaInput) => bacaTawaranSurat(cari),
  component: HalamanProfilPenduduk,
})
