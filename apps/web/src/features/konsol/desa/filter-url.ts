// Dari modul ringan `filter`, bukan `schema`: berkas ini dipakai `validateSearch` dan ikut masuk JS awal (Tugas 2).
import { filterDesaKonsolSchema, type FilterDesaKonsol } from '@/domain/konsol/filter'
import { bacaFilterUrl } from '../../admin/baca-filter'

export const FILTER_DESA_BAWAAN: FilterDesaKonsol = filterDesaKonsolSchema.parse({})

/** Filter Daftar desa dari alamat halaman; parameter rusak diabaikan satu per satu. */
export const bacaFilterDesa = (cari: Record<string, unknown>): FilterDesaKonsol => bacaFilterUrl(filterDesaKonsolSchema, cari)
