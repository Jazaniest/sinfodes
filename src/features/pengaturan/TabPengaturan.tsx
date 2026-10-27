import type { ReactNode } from 'react'
import { useBoleh } from '@/features/admin/useBoleh'
import { TabNav } from '@/ui/navigasi/TabNav'
import { PageHeader } from '@/ui/tata-letak/PageHeader'

type Aktif = 'identitas' | 'wilayah' | 'pengguna' | 'penomoran' | 'tata-letak-surat' | 'modul' | 'langganan' | 'akses-sinfodes'

/**
 * Tab Pengaturan (SPEC §8): Identitas · Wilayah · Pengguna (khusus Sekretaris Desa) · Penomoran · Tata letak surat (SPEC-V0.2 §12.2) · Modul (khusus Sekretaris Desa,
 * SPEC-V0.2 §12.3) · Langganan (Sekretaris, Kepala
 * Desa, dan Kaur Keuangan, SPEC-V0.2 §10) · Akses Sinfodes (Sekretaris dan Kepala Desa, SPEC-V0.2 §5.3). Kepala Desa hanya
 * melihat Langganan dan Akses Sinfodes; Kaur Keuangan hanya Langganan.
 */
export function TabPengaturan({ aktif }: { aktif: Aktif }) {
  const boleh = useBoleh()
  const kelola = boleh('pengaturan.kelola')
  const items = [
    ...(kelola
      ? [
          { label: 'Identitas', href: '/admin/pengaturan', aktif: aktif === 'identitas' },
          { label: 'Wilayah', href: '/admin/pengaturan/wilayah', aktif: aktif === 'wilayah' },
        ]
      : []),
    ...(boleh('pengguna.kelola')
      ? [{ label: 'Pengguna', href: '/admin/pengaturan/pengguna', aktif: aktif === 'pengguna' }]
      : []),
    ...(kelola ? [{ label: 'Penomoran', href: '/admin/pengaturan/penomoran', aktif: aktif === 'penomoran' }] : []),
    ...(kelola
      ? [{ label: 'Tata letak surat', href: '/admin/pengaturan/tata-letak-surat', aktif: aktif === 'tata-letak-surat' }]
      : []),
    ...(boleh('modul.kelola') ? [{ label: 'Modul', href: '/admin/pengaturan/modul', aktif: aktif === 'modul' }] : []),
    ...(boleh('langganan.lihat')
      ? [{ label: 'Langganan', href: '/admin/pengaturan/langganan', aktif: aktif === 'langganan' }]
      : []),
    ...(boleh('akses-sinfodes.kelola')
      ? [{ label: 'Akses Sinfodes', href: '/admin/pengaturan/akses-sinfodes', aktif: aktif === 'akses-sinfodes' }]
      : []),
  ]
  return <TabNav label="Bagian pengaturan" items={items} />
}

/** Kepala halaman Pengaturan, sama untuk semua tab. `aksi` mis. tombol Undang pengguna. */
export function KepalaPengaturan({ aktif, aksi }: { aktif: Aktif; aksi?: ReactNode }) {
  return <PageHeader jejak={[{ label: 'Pengaturan' }]} judul="Pengaturan desa" aksi={aksi} tab={<TabPengaturan aktif={aktif} />} />
}
