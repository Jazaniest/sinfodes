import { TabNav } from '@/ui/navigasi/TabNav'

/** Tab modul Kependudukan (SPEC §5.2). Statistik ditambahkan di 2A-3. */
export function TabKependudukan({ aktif }: { aktif: 'penduduk' | 'keluarga' | 'mutasi' }) {
  return (
    <TabNav
      label="Bagian kependudukan"
      items={[
        { label: 'Penduduk', href: '/admin/kependudukan/penduduk', aktif: aktif === 'penduduk' },
        { label: 'Keluarga', href: '/admin/kependudukan/keluarga', aktif: aktif === 'keluarga' },
        { label: 'Mutasi', href: '/admin/kependudukan/mutasi', aktif: aktif === 'mutasi' },
      ]}
    />
  )
}
