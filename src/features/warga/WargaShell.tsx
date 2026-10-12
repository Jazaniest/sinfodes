import { ClockCounterClockwise, House, UserCircle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-aria-components'
import type { SesiWarga } from '@/domain/warga/sesi'
import { cn } from '@/ui/cn'
import { LambangDesa } from '@/ui/domain/LambangDesa'
import { MENU_WARGA, menuWargaAktif, type KunciMenuWarga } from './navigasi'

const IKON: Readonly<Record<KunciMenuWarga, ReactNode>> = {
  beranda: <House aria-hidden size={22} />,
  riwayat: <ClockCounterClockwise aria-hidden size={22} />,
  akun: <UserCircle aria-hidden size={22} />,
}

type Props = { sesi: SesiWarga; jalur: string; children: ReactNode }

/**
 * Kerangka layanan warga untuk HP 360px (SPEC §4.7, §10): kepala berisi lambang dan nama desa, navigasi bawah berlabel
 * teks. Saat toolbar demo tampil, navigasi dan isi diberi ruang di bawah supaya tidak tertutup (fokus review 4).
 */
export function WargaShell({ sesi, jalur, children }: Props) {
  return (
    <div className="skala-warga min-h-dvh bg-kertas text-teks text-tinta">
      <header className="border-b-[1.5px] border-tinta">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <LambangDesa nama={sesi.desa.nama} gambar={sesi.desa.lambang} />
          <div className="min-w-0">
            <p className="truncate font-serif text-judul-bagian font-medium">Desa {sesi.desa.nama}</p>
            <p className="truncate text-teks-kecil text-tinta-2">Layanan warga · Kecamatan {sesi.desa.kecamatan.nama}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pt-5 pb-28 [html[data-demo-toolbar]_&]:pb-40">{children}</main>
      <nav
        aria-label="Menu layanan warga"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-garis bg-lembar [html[data-demo-toolbar]_&]:pb-14"
      >
        <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col">
          {MENU_WARGA.map((m) => {
            const aktif = menuWargaAktif(m.href, jalur)
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-0.5 border-t-2 text-teks-kecil font-medium',
                    'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:-outline-offset-4 data-[focus-visible]:outline-biru',
                    aktif ? 'border-biru text-biru' : 'border-transparent text-tinta-2 hover:text-tinta',
                  )}
                >
                  {IKON[m.kunci]}
                  {m.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
