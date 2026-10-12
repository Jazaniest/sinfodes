import type { ReactNode } from 'react'
import { domainDesa } from '@/domain/surat/verifikasi'
import { TabNav } from '@/ui/navigasi/TabNav'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { useSesiAdmin } from '../admin/sesi-konteks'

type Aktif = 'artikel' | 'pengumuman' | 'agenda' | 'galeri' | 'tampilan'

/** Tab Website Desa (SPEC §8): Artikel · Pengumuman · Agenda · Galeri · Tampilan. */
export function TabWebsite({ aktif }: { aktif: Aktif }) {
  return (
    <TabNav
      label="Bagian website desa"
      items={[
        { label: 'Artikel', href: '/admin/website', aktif: aktif === 'artikel' },
        { label: 'Pengumuman', href: '/admin/website/pengumuman', aktif: aktif === 'pengumuman' },
        { label: 'Agenda', href: '/admin/website/agenda', aktif: aktif === 'agenda' },
        { label: 'Galeri', href: '/admin/website/galeri', aktif: aktif === 'galeri' },
        { label: 'Tampilan', href: '/admin/website/tampilan', aktif: aktif === 'tampilan' },
      ]}
    />
  )
}

/** Kepala halaman Website Desa; meta bawaannya alamat website desa. */
export function KepalaWebsite({ aktif, meta }: { aktif: Aktif; meta?: ReactNode }) {
  const { desa } = useSesiAdmin()
  return (
    <PageHeader
      jejak={[{ label: 'Publikasi' }]}
      judul="Website Desa"
      meta={meta ?? `Tampil di ${domainDesa(desa.slug)}`}
      tab={<TabWebsite aktif={aktif} />}
    />
  )
}
