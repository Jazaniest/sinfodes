import { boleh, type Kemampuan } from '@/domain/pengguna/hak-akses'
import type { Peran } from '@/domain/pengguna/schema'

export type ItemMenu = { label: string; href: string; kemampuan: Kemampuan | null; awalan: string }
export type KelompokMenu = { judul: string | null; item: ItemMenu[] }

/** SPEC §5.2. Hanya modul yang sudah dibangun; modul lain ditambahkan di tahapnya masing-masing. */
export const MENU_ADMIN: readonly KelompokMenu[] = [
  { judul: null, item: [{ label: 'Beranda', href: '/admin', kemampuan: null, awalan: '/admin' }] },
  {
    judul: 'Data desa',
    item: [{ label: 'Kependudukan', href: '/admin/kependudukan/penduduk', kemampuan: 'penduduk.lihat', awalan: '/admin/kependudukan' }],
  },
]

/** Menu yang tidak berhak diakses disembunyikan, bukan dinonaktifkan (SPEC §5.1). */
export function menuUntuk(peran: Peran): KelompokMenu[] {
  return MENU_ADMIN.map((k) => ({ ...k, item: k.item.filter((i) => i.kemampuan === null || boleh(peran, i.kemampuan)) })).filter(
    (k) => k.item.length > 0,
  )
}

/** Beranda aktif hanya tepat di /admin; menu lain aktif untuk semua sub-halamannya. */
export function menuAktif(item: ItemMenu, jalur: string): boolean {
  const bersih = jalur.replace(/\/+$/, '')
  if (item.href === '/admin') return bersih === '/admin'
  return bersih === item.awalan || bersih.startsWith(`${item.awalan}/`)
}
