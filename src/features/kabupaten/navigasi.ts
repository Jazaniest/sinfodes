import { bolehKabupaten } from '@/domain/kabupaten/hak-akses'
import type { PeranKabupaten } from '@/domain/kabupaten/schema'

export type ItemMenuKabupaten = { label: string; href: string }

/**
 * Menu dasbor kabupaten (SPEC-V0.2 §8.3). Hanya menu yang sudah dibangun: Siaran menyusul di 7B-3, Indeks & Peringkat di 7C.
 * Pengguna hanya untuk Admin.
 */
export function menuKabupaten(peran: PeranKabupaten): ItemMenuKabupaten[] {
  return [
    { label: 'Ringkasan', href: '/kabupaten/admin' },
    { label: 'Pemantauan', href: '/kabupaten/admin/pemantauan' },
    { label: 'Dana Desa', href: '/kabupaten/admin/dana-desa' },
    { label: 'Peta', href: '/kabupaten/admin/peta' },
    { label: 'Data gabungan', href: '/kabupaten/admin/data-gabungan' },
    { label: 'Laporan', href: '/kabupaten/admin/laporan' },
    ...(bolehKabupaten(peran, 'kab.pengguna') ? [{ label: 'Pengguna', href: '/kabupaten/admin/pengguna' }] : []),
  ]
}

/** Ringkasan hanya aktif di akar dasbor; menu lain juga aktif di halaman di bawahnya. */
export function menuKabupatenAktif(href: string, jalur: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === '/kabupaten/admin') return bersih === href
  return bersih === href || bersih.startsWith(`${href}/`)
}
