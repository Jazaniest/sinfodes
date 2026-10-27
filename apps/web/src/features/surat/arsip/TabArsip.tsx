import { TabNav } from '@/ui/navigasi/TabNav'

/** Dua buku arsip Layanan Surat (SPEC §7.4 layar 5). */
export function TabArsip({ aktif }: { aktif: 'keluar' | 'masuk' }) {
  return (
    <TabNav
      label="Jenis arsip"
      items={[
        { label: 'Surat keluar', href: '/admin/surat/arsip', aktif: aktif === 'keluar' },
        { label: 'Surat masuk', href: '/admin/surat/arsip/masuk', aktif: aktif === 'masuk' },
      ]}
    />
  )
}
