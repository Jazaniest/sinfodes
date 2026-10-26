import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { STATUS_DAFTAR_JENIS, type StatusJenis } from '@/domain/surat/jenis'
import { HalamanDaftarJenis } from '@/features/surat/jenis/HalamanDaftarJenis'

export const Route = createFileRoute('/admin/_panel/surat/jenis/')({
  // Penyaring status di URL (`?status=`); nilai asing diabaikan dan daftar tampil lengkap.
  validateSearch: (cari: { status?: unknown } & SearchSchemaInput): { status?: StatusJenis } => {
    const status = STATUS_DAFTAR_JENIS.find((s) => s === cari.status)
    return status ? { status } : {}
  },
  component: HalamanDaftarJenis,
})
