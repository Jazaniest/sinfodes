import { filterPendudukSchema, LABEL_PRESET, type FilterPenduduk } from '@/domain/penduduk/filter'
import { namaDusunPendek } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import { bacaFilterUrl } from '../admin/baca-filter'

export const FILTER_PENDUDUK_BAWAAN: FilterPenduduk = filterPendudukSchema.parse({})

export const bacaFilterPenduduk = (cari: Record<string, unknown>): FilterPenduduk => bacaFilterUrl(filterPendudukSchema, cari)

/** Mengembalikan semua filter ke bawaan; urutan dan ukuran halaman tetap. */
export const HAPUS_SEMUA_FILTER: Partial<FilterPenduduk> = {
  dusun: undefined, rt: undefined, jk: undefined, umurMin: undefined, umurMax: undefined, agama: undefined,
  pendidikan: undefined, pekerjaan: undefined, kawin: undefined, ktpEl: undefined, status: 'Hidup', preset: undefined, page: 1,
}

export type FilterAktif = { kunci: string; label: string; hapus: Partial<FilterPenduduk> }

function labelUmur(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `Umur ${min}–${max} tahun`
  return min !== undefined ? `Umur ≥ ${min} tahun` : `Umur ≤ ${max} tahun`
}

/** Filter yang sedang aktif (selain urutan dan halaman) untuk ditampilkan sebagai chip yang bisa dihapus. */
export function daftarFilterAktif(f: FilterPenduduk, dusun: readonly Dusun[], istilah: Desa['istilahWilayah']): FilterAktif[] {
  const hasil: FilterAktif[] = []
  if (f.dusun !== undefined) {
    const d = dusun.find((x) => x.nomor === f.dusun)
    hasil.push({ kunci: 'dusun', label: d ? namaDusunPendek(d, istilah) : `${istilah.dusun} ${f.dusun}`, hapus: { dusun: undefined, rt: undefined, page: 1 } })
  }
  if (f.rt !== undefined) hasil.push({ kunci: 'rt', label: `${istilah.rt} ${f.rt}`, hapus: { rt: undefined, page: 1 } })
  if (f.jk !== undefined) hasil.push({ kunci: 'jk', label: f.jk === 'L' ? 'Laki-laki' : 'Perempuan', hapus: { jk: undefined, page: 1 } })
  if (f.umurMin !== undefined || f.umurMax !== undefined) {
    hasil.push({ kunci: 'umur', label: labelUmur(f.umurMin, f.umurMax), hapus: { umurMin: undefined, umurMax: undefined, page: 1 } })
  }
  if (f.agama) hasil.push({ kunci: 'agama', label: f.agama, hapus: { agama: undefined, page: 1 } })
  if (f.pendidikan) hasil.push({ kunci: 'pendidikan', label: f.pendidikan, hapus: { pendidikan: undefined, page: 1 } })
  if (f.pekerjaan) hasil.push({ kunci: 'pekerjaan', label: f.pekerjaan, hapus: { pekerjaan: undefined, page: 1 } })
  if (f.kawin) hasil.push({ kunci: 'kawin', label: f.kawin, hapus: { kawin: undefined, page: 1 } })
  if (f.ktpEl) hasil.push({ kunci: 'ktpEl', label: `KTP-el: ${f.ktpEl}`, hapus: { ktpEl: undefined, page: 1 } })
  if (f.status !== 'Hidup') hasil.push({ kunci: 'status', label: `Status: ${f.status}`, hapus: { status: 'Hidup', page: 1 } })
  if (f.preset) hasil.push({ kunci: 'preset', label: LABEL_PRESET[f.preset], hapus: { preset: undefined, page: 1 } })
  return hasil
}

/** Tautan ke daftar penduduk dengan filter tertentu, mis. dari batang Statistik (SPEC §6.7). */
export function hrefDaftarPenduduk(filter: Partial<FilterPenduduk>): string {
  const cari = Object.entries(filter)
    .filter(([, nilai]) => nilai !== undefined)
    .map(([kunci, nilai]) => `${kunci}=${encodeURIComponent(String(nilai))}`)
    .join('&')
  return cari ? `/admin/kependudukan/penduduk?${cari}` : '/admin/kependudukan/penduduk'
}
