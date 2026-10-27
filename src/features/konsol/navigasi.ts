export type ItemMenuKonsol = { label: string; href: string }

/** Menu Konsol (SPEC-V0.2 §7). Pemantauan pindah ke dasbor kabupaten (§8.3). */
export const MENU_KONSOL: readonly ItemMenuKonsol[] = [
  { label: 'Ringkasan', href: '/konsol' },
  { label: 'Desa', href: '/konsol/desa' },
  { label: 'Kabupaten', href: '/konsol/kabupaten' },
  { label: 'Tagihan', href: '/konsol/tagihan' },
]

/** Ringkasan hanya aktif di /konsol; menu lain juga aktif di halaman di bawahnya, mis. detail desa. */
export function menuKonsolAktif(href: string, jalur: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === '/konsol') return bersih === href
  return bersih === href || bersih.startsWith(`${href}/`)
}
