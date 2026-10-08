import { TabNav } from '@/ui/navigasi/TabNav'

/** Tab modul Kependudukan (SPEC §5.2). Mutasi dan Statistik ditambahkan di 2A-2. */
export function TabKependudukan({ aktif }: { aktif: 'penduduk' | 'keluarga' }) {
  return (
    <TabNav
      label="Bagian kependudukan"
      items={[
        { label: 'Penduduk', href: '/admin/kependudukan/penduduk', aktif: aktif === 'penduduk' },
        { label: 'Keluarga', href: '/admin/kependudukan/keluarga', aktif: aktif === 'keluarga' },
      ]}
    />
  )
}
