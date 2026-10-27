import type { ItemMenuAksi } from '@/ui/lapisan/Menu'

/** Menu *Catat mutasi* di Buku Mutasi (SPEC §6.6). */
export const MENU_CATAT_MUTASI: readonly ItemMenuAksi[] = [
  { id: 'lahir', label: 'Kelahiran', href: '/admin/kependudukan/mutasi/lahir' },
  { id: 'meninggal', label: 'Kematian', href: '/admin/kependudukan/mutasi/meninggal' },
  { id: 'pindah', label: 'Pindah keluar', href: '/admin/kependudukan/mutasi/pindah' },
  { id: 'datang', label: 'Kedatangan', href: '/admin/kependudukan/mutasi/datang' },
]

/** Menu *Catat mutasi* di profil (SPEC §6.3): penduduknya langsung terisi. ID internal, bukan NIK. */
export function menuMutasiPenduduk(pendudukId: string): readonly ItemMenuAksi[] {
  return [
    { id: 'meninggal', label: 'Meninggal', href: `/admin/kependudukan/mutasi/meninggal?penduduk=${pendudukId}` },
    { id: 'pindah', label: 'Pindah keluar', href: `/admin/kependudukan/mutasi/pindah?penduduk=${pendudukId}` },
  ]
}
