export type KunciMenuWarga = 'beranda' | 'riwayat' | 'akun'
export type ItemMenuWarga = { kunci: KunciMenuWarga; label: string; href: string }

/** Navigasi bawah layanan warga (SPEC §10). *Ajukan* menyusul di Tahap 4B bersama halamannya. */
export const MENU_WARGA: readonly ItemMenuWarga[] = [
  { kunci: 'beranda', label: 'Beranda', href: '/warga' },
  { kunci: 'riwayat', label: 'Riwayat', href: '/warga/riwayat' },
  { kunci: 'akun', label: 'Akun', href: '/warga/akun' },
]

/** Beranda hanya aktif di /warga; menu lain juga aktif di halaman di bawahnya, mis. detail riwayat. */
export function menuWargaAktif(href: string, jalur: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === '/warga') return bersih === '/warga'
  return bersih === href || bersih.startsWith(`${href}/`)
}
