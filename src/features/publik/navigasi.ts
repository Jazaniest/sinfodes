/**
 * Menu website desa kini dibaca dari `identitas.menu` (susunan terbit, SPEC-V0.2 11.4), berisi Beranda lalu halaman sistem
 * yang tampil, halaman tambahan, dan tautan luar. Beranda hanya aktif di alamat beranda; menu lain juga aktif di halaman di
 * bawahnya, misalnya artikel dan halaman tambahan.
 */
export function menuPublikAktif(href: string, jalur: string, slug: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === `/desa/${slug}`) return bersih === href
  return bersih === href || bersih.startsWith(`${href}/`)
}
