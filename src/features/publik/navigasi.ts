export type ItemMenuPublik = { label: string; href: string }

/** Menu website desa (SPEC §9). Profil, Transparansi, Statistik, dan Potensi menyusul di Tahap 5B bersama halamannya. */
export function menuPublik(slug: string): ItemMenuPublik[] {
  const dasar = `/desa/${slug}`
  return [
    { label: 'Beranda', href: dasar },
    { label: 'Kabar', href: `${dasar}/kabar` },
    { label: 'Layanan', href: `${dasar}/layanan` },
    { label: 'Cek surat', href: `${dasar}/verifikasi` },
  ]
}

/** Beranda hanya aktif di alamat beranda; menu lain juga aktif di halaman di bawahnya, mis. artikel. */
export function menuPublikAktif(href: string, jalur: string, slug: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === `/desa/${slug}`) return bersih === href
  return bersih === href || bersih.startsWith(`${href}/`)
}
