import { TabNav } from '@/ui/navigasi/TabNav'

/** Tab modul Kependudukan (SPEC §5.2). */
export function TabKependudukan({ aktif }: { aktif: 'penduduk' | 'keluarga' | 'mutasi' | 'statistik' }) {
  return (
    <TabNav
      label="Bagian kependudukan"
      items={[
        { label: 'Penduduk', href: '/admin/kependudukan/penduduk', aktif: aktif === 'penduduk' },
        { label: 'Keluarga', href: '/admin/kependudukan/keluarga', aktif: aktif === 'keluarga' },
        { label: 'Mutasi', href: '/admin/kependudukan/mutasi', aktif: aktif === 'mutasi' },
        { label: 'Statistik', href: '/admin/kependudukan/statistik', aktif: aktif === 'statistik' },
      ]}
    />
  )
}
