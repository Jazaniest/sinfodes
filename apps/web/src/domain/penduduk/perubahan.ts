import { formatTanggal } from '../format/tanggal'
import { kelompokkanNik } from './nik'
import { FIELD_RIWAYAT, type FieldRiwayat } from './riwayat'
import type { Penduduk } from './schema'

export type Perubahan = { field: FieldRiwayat; nilaiLama: string | null; nilaiBaru: string | null }

/** Nilai field seperti dibaca orang, untuk Riwayat: "Laki-laki", "12 Maret 1991", NIK berkelompok. */
export function teksNilaiRiwayat(field: FieldRiwayat, nilai: string | null): string | null {
  if (nilai === null || nilai === '') return null
  switch (field) {
    case 'jenisKelamin':
      return nilai === 'P' ? 'Perempuan' : 'Laki-laki'
    case 'tanggalLahir':
      return formatTanggal(nilai)
    case 'nik':
      return kelompokkanNik(nilai)
    default:
      return nilai
  }
}

/** Field yang nilainya berbeda antara data lama dan isian ubah, berurutan menurut FIELD_RIWAYAT. */
export function daftarPerubahan(lama: Penduduk, ubah: Partial<Record<FieldRiwayat, string | null>>): Perubahan[] {
  return FIELD_RIWAYAT.flatMap((field): Perubahan[] => {
    if (!(field in ubah)) return []
    const baru = ubah[field] ?? null
    const sebelum = lama[field] ?? null
    if (baru === sebelum) return []
    return [{ field, nilaiLama: teksNilaiRiwayat(field, sebelum), nilaiBaru: teksNilaiRiwayat(field, baru) }]
  })
}
