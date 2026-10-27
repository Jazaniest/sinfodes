import { List } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Button, Link } from 'react-aria-components'
import { LABEL_PERAN_KABUPATEN, type SesiKabupaten } from '@/domain/kabupaten/schema'
import { cn } from '@/ui/cn'
import { useMediaQuery } from '@/ui/hooks/useMediaQuery'
import { Drawer } from '@/ui/lapisan/Drawer'
import { MenuAksi } from '@/ui/lapisan/Menu'
import type { ModeTampilan } from '@/ui/mode/mode'
import { pilihanMode } from '@/ui/mode/pilihan-mode'
import { useModeTampilan } from '@/ui/mode/useModeTampilan'
import { LambangContoh } from './LambangContoh'
import { menuKabupaten, menuKabupatenAktif } from './navigasi'

type Props = { sesi: SesiKabupaten; jalur: string; onKeluar: () => void; children: ReactNode }

const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

function Kepala({ nama }: { nama: string }) {
  return (
    <div className="flex items-center gap-3">
      <LambangContoh nama={nama} className="h-10 w-auto shrink-0 text-tinta" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-serif font-medium">Kabupaten {nama}</span>
        <span className="text-label tracking-wide text-tinta-2 uppercase">Dasbor kabupaten</span>
      </span>
    </div>
  )
}

type PropsIsi = Omit<Props, 'children'> & { onPilih?: () => void; mode: ModeTampilan; ubahMode: (mode: ModeTampilan) => void }

function IsiNavigasi({ sesi, jalur, onKeluar, onPilih, mode, ubahMode }: PropsIsi) {
  const { pengguna, kabupaten } = sesi
  return (
    <div className="flex h-full flex-col gap-6 border-r border-garis bg-kertas-2 px-4 py-5">
      <Kepala nama={kabupaten.nama} />
      <nav aria-label="Menu kabupaten" className="flex-1">
        <ul className="flex flex-col gap-0.5">
          {menuKabupaten(pengguna.peran).map((m) => {
            const aktif = menuKabupatenAktif(m.href, jalur)
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onPress={onPilih}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center rounded-1 border-l-2 px-2',
                    aktif ? 'border-biru bg-lembar font-medium text-tinta' : 'border-transparent text-tinta-2 hover:bg-lembar hover:text-tinta',
                    fokus,
                  )}
                >
                  {m.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-garis pt-4">
        <MenuAksi
          placement="top start"
          pemicu={
            <Button className={cn('w-full min-w-0 rounded-1 px-2 py-1 text-left hover:bg-lembar', fokus)}>
              <span className="block truncate font-medium">{pengguna.nama}</span>
              <span className="block truncate text-teks-kecil text-tinta-2">{LABEL_PERAN_KABUPATEN[pengguna.peran]}</span>
            </Button>
          }
          items={[{ id: 'keluar', label: 'Keluar', onAction: onKeluar }]}
          pilihan={pilihanMode(mode, ubahMode)}
        />
      </div>
    </div>
  )
}

/**
 * Kerangka dasbor kabupaten (SPEC-V0.2 §8.3): sidebar terang dengan lambang kabupaten, beda dari Konsol (tinta gelap) dan dari
 * panel desa (nama desa).
 */
export function KabupatenShell({ children, ...props }: Props) {
  const lebar = useMediaQuery('(min-width: 1024px)')
  // Mode gelap pribadi: dipasang ke <html> selama kerangka terbuka, dilepas saat kerangka dilepas.
  const [mode, ubahMode] = useModeTampilan()
  const nav = { ...props, mode, ubahMode }
  const [laciTerbuka, setLaciTerbuka] = useState(false)
  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-1 focus:bg-lembar focus:px-3 focus:py-2"
      >
        Langsung ke isi
      </a>
      {lebar ? (
        <aside className="sticky top-0 h-screen w-[216px] shrink-0 xl:w-[240px] print:hidden">
          <IsiNavigasi {...nav} />
        </aside>
      ) : (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-garis bg-kertas-2 px-4 print:hidden">
          <div className="min-w-0 flex-1">
            <Kepala nama={nav.sesi.kabupaten.nama} />
          </div>
          <Button onPress={() => setLaciTerbuka(true)} className={cn('flex items-center gap-1.5 rounded-1 px-2 py-1.5 font-medium', fokus)}>
            <List aria-hidden size={18} />
            Menu
          </Button>
          <Drawer isOpen={laciTerbuka} onOpenChange={setLaciTerbuka} judul="Menu" sisi="kiri">
            <IsiNavigasi {...nav} onPilih={() => setLaciTerbuka(false)} />
          </Drawer>
        </header>
      )}
      <main id="isi" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 print:p-0">
        {children}
      </main>
    </div>
  )
}
