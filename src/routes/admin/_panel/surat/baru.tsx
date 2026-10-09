import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import { bacaCariBuatSurat, CARI_BUAT_BAWAAN, type CariBuatSurat } from '@/features/surat/buat/cari-buat'
import { HalamanBuatSurat } from '@/features/surat/buat/HalamanBuatSurat'

export const Route = createFileRoute('/admin/_panel/surat/baru')({
  // Parameter rusak (mis. langkah di luar 1–4) diabaikan; langkah yang belum lengkap dikembalikan di layar.
  validateSearch: (cari: Partial<CariBuatSurat> & SearchSchemaInput) => bacaCariBuatSurat(cari),
  search: { middlewares: [stripSearchParams(CARI_BUAT_BAWAAN)] },
  component: HalamanBuatSurat,
})
