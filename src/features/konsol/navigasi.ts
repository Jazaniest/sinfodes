import type { PeranKonsol } from '@/domain/konsol/schema'

export type ItemMenuKonsol = { label: string; href: string }

/** Menu Konsol (SPEC §11): menu Desa khusus Tim Sinfodes; Pemantauan khusus pemantau sampai pindah ke kabupaten (SPEC-V0.2 §5.1). */
export function menuKonsol(peran: PeranKonsol): ItemMenuKonsol[] {
  return [
    { label: 'Ringkasan', href: '/konsol' },
    ...(peran === 'tim' ? [{ label: 'Desa', href: '/konsol/desa' }] : []),
    ...(peran === 'pemantau' ? [{ label: 'Pemantauan', href: '/konsol/pemantauan' }] : []),
  ]
}

/** Ringkasan hanya aktif di /konsol; menu lain juga aktif di halaman di bawahnya, mis. detail desa. */
export function menuKonsolAktif(href: string, jalur: string): boolean {
  const bersih = jalur.length > 1 ? jalur.replace(/\/$/, '') : jalur
  if (href === '/konsol') return bersih === href
  return bersih === href || bersih.startsWith(`${href}/`)
}
