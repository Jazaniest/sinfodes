import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { GalatApi, pesanGalat } from '@/api/galat'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { tampilkanToast } from '@/ui/toast/antrean'

/**
 * Pasang galat per field dari API (SPEC §3.4 `fields`) ke isian formulir. `petakan` menerjemahkan nama field API,
 * mis. "bayi.nama" → "nama". Galat tanpa field yang dikenal tampil sebagai toast.
 */
export function terapkanGalatServer<T extends FieldValues>(
  galat: unknown,
  petakan: (field: string) => Path<T> | null,
  setError: UseFormSetError<T>,
  akar: HTMLElement | null,
): void {
  if (galat instanceof GalatApi) {
    const cocok = Object.entries(galat.fields).flatMap(([field, pesan]) => {
      const nama = petakan(field)
      return nama ? [{ nama, pesan }] : []
    })
    for (const { nama, pesan } of cocok) setError(nama, { type: 'server', message: pesan })
    if (cocok.length > 0) {
      fokusIsianSalah(akar)
      return
    }
  }
  tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
}
