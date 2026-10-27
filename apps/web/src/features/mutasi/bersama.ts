import type { SearchSchemaInput } from '@tanstack/react-router'

export const JEJAK_MUTASI = [{ label: 'Kependudukan' }, { label: 'Mutasi', href: '/admin/kependudukan/mutasi' }] as const

/** `?penduduk=` berisi ID internal (pdk_…), bukan NIK (SPEC §3.1). Nilai lain diabaikan. */
export function bacaPendudukAwal(cari: { penduduk?: unknown } & SearchSchemaInput): { penduduk?: string } {
  return typeof cari.penduduk === 'string' && /^pdk_[a-z0-9_]+$/.test(cari.penduduk) ? { penduduk: cari.penduduk } : {}
}

/** `?laporan=` berisi ID laporan warga (lap_…), untuk alur Lahir dari laporan (SPEC §5.3). Nilai lain diabaikan. */
export function bacaLaporanAwal(cari: { laporan?: unknown } & SearchSchemaInput): { laporan?: string } {
  return typeof cari.laporan === 'string' && /^lap_[a-z0-9_]+$/.test(cari.laporan) ? { laporan: cari.laporan } : {}
}
