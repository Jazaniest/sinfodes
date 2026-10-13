export type ItemMenuPublik = { label: string; href: string }

/** Menu website desa (SPEC §9), urut seperti kepala warta desa. Di HP menu bergulir ke samping. */
export function menuPublik(slug: string): ItemMenuPublik[] {
  const dasar = `/desa/${slug}`
  return [
    { label: 'Beranda', href: dasar },
    { label: 'Profil', href: `${dasar}/profil` },
    { label: 'Kabar', href: `${dasar}/kabar` },
    { label: 'Transparansi', href: `${dasar}/transparansi` },
    { label: 'Statistik', href: `${dasar}/statistik` },
    { label: 'Potensi', href: `${dasar}/potensi` },
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
