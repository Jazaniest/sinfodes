export type KunciMenuWarga = 'beranda' | 'ajukan' | 'riwayat' | 'akun'
export type ItemMenuWarga = { kunci: KunciMenuWarga; label: string; href: string }

/** Navigasi bawah layanan warga (SPEC §10): Beranda · Ajukan · Riwayat · Akun. */
export const MENU_WARGA: readonly ItemMenuWarga[] = [
  { kunci: 'beranda', label: 'Beranda', href: '/warga' },
  { kunci: 'ajukan', label: 'Ajukan', href: '/warga/ajukan' },
  { kunci: 'riwayat', label: 'Riwayat', href: '/warga/riwayat' },
  { kunci: 'akun', label: 'Akun', href: '/warga/akun' },
]

/** Beranda hanya aktif di /warga; menu lain juga aktif di halaman di bawahnya, mis. detail riwayat. */
export function menuWargaAktif(href: string, jalur: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === '/warga') return bersih === '/warga'
  return bersih === href || bersih.startsWith(`${href}/`)
}
