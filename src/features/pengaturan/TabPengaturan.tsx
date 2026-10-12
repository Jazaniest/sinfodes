import type { ReactNode } from 'react'
import { boleh } from '@/domain/pengguna/hak-akses'
import { TabNav } from '@/ui/navigasi/TabNav'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { useSesiAdmin } from '../admin/sesi-konteks'

type Aktif = 'identitas' | 'wilayah' | 'pengguna' | 'penomoran'

/** Tab Pengaturan (SPEC §8): Identitas · Wilayah · Pengguna (khusus Sekretaris Desa) · Penomoran. */
export function TabPengaturan({ aktif }: { aktif: Aktif }) {
  const { pengguna } = useSesiAdmin()
  const items = [
    { label: 'Identitas', href: '/admin/pengaturan', aktif: aktif === 'identitas' },
    { label: 'Wilayah', href: '/admin/pengaturan/wilayah', aktif: aktif === 'wilayah' },
    ...(boleh(pengguna.peran, 'pengguna.kelola')
      ? [{ label: 'Pengguna', href: '/admin/pengaturan/pengguna', aktif: aktif === 'pengguna' }]
      : []),
    { label: 'Penomoran', href: '/admin/pengaturan/penomoran', aktif: aktif === 'penomoran' },
  ]
  return <TabNav label="Bagian pengaturan" items={items} />
}

/** Kepala halaman Pengaturan, sama untuk keempat tab. `aksi` mis. tombol Undang pengguna. */
export function KepalaPengaturan({ aktif, aksi }: { aktif: Aktif; aksi?: ReactNode }) {
  return <PageHeader jejak={[{ label: 'Pengaturan' }]} judul="Pengaturan desa" aksi={aksi} tab={<TabPengaturan aktif={aktif} />} />
}
