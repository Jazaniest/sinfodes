import { TabNav } from '@/ui/navigasi/TabNav'

/** Tab modul Layanan Surat (SPEC §5.2): Permohonan · Arsip · Jenis Surat. */
export function TabSurat({ aktif }: { aktif: 'permohonan' | 'arsip' | 'jenis' }) {
  return (
    <TabNav
      label="Bagian layanan surat"
      items={[
        { label: 'Permohonan', href: '/admin/surat', aktif: aktif === 'permohonan' },
        { label: 'Arsip', href: '/admin/surat/arsip', aktif: aktif === 'arsip' },
        { label: 'Jenis Surat', href: '/admin/surat/jenis', aktif: aktif === 'jenis' },
      ]}
    />
  )
}
