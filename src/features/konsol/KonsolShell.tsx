import { List } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Button, Link } from 'react-aria-components'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { LABEL_PERAN_KONSOL, type SesiKonsol } from '@/domain/konsol/schema'
import { cn } from '@/ui/cn'
import { useMediaQuery } from '@/ui/hooks/useMediaQuery'
import { Drawer } from '@/ui/lapisan/Drawer'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { menuKonsol, menuKonsolAktif } from './navigasi'

type Props = { sesi: SesiKonsol; jalur: string; onKeluar: () => void; children: ReactNode }

const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-kapur'

function Merek() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-1 bg-kapur p-1">
        <img src={logoMark} alt="" className="h-full w-auto" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-serif font-medium text-kapur">Sinfodes</span>
        <span className="text-label tracking-wide text-kapur/75 uppercase">Konsol</span>
      </span>
    </div>
  )
}

function IsiNavigasi({ sesi, jalur, onKeluar, onPilih }: Omit<Props, 'children'> & { onPilih?: () => void }) {
  const { pengguna } = sesi
  return (
    <div className="flex h-full flex-col gap-6 bg-tinta px-4 py-5 text-kapur">
      <Merek />
      <nav aria-label="Menu konsol" className="flex-1">
        <ul className="flex flex-col gap-0.5">
          {menuKonsol(pengguna.peran).map((m) => {
            const aktif = menuKonsolAktif(m.href, jalur)
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onPress={onPilih}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center rounded-1 border-l-2 px-2',
                    aktif ? 'border-oker-muda bg-kapur/10 font-medium text-kapur' : 'border-transparent text-kapur/80 hover:bg-kapur/10 hover:text-kapur',
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
      <div className="border-t border-kapur/20 pt-4">
        <MenuAksi
          placement="top start"
          pemicu={
            <Button className={cn('w-full min-w-0 rounded-1 px-2 py-1 text-left hover:bg-kapur/10', fokus)}>
              <span className="block truncate font-medium">{pengguna.nama}</span>
              <span className="block truncate text-teks-kecil text-kapur/75">
                {pengguna.wilayah ? `Pemantau · Kabupaten ${pengguna.wilayah.nama}` : LABEL_PERAN_KONSOL[pengguna.peran]}
              </span>
            </Button>
          }
          items={[{ id: 'keluar', label: 'Keluar', onAction: onKeluar }]}
        />
      </div>
    </div>
  )
}

/** Kerangka Konsol (SPEC §11, §4.7): sidebar tinta gelap dengan logo Sinfodes di depan, supaya jelas beda dari panel desa. */
export function KonsolShell({ children, ...nav }: Props) {
  const lebar = useMediaQuery('(min-width: 1024px)')
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-tinta px-4 text-kapur print:hidden">
          <div className="min-w-0 flex-1">
            <Merek />
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
