import { List, MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button, Link } from 'react-aria-components'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { formatAngka } from '@/domain/format/angka'
import { LABEL_PERAN, type SesiAdmin } from '@/domain/pengguna/schema'
import { cn } from '@/ui/cn'
import { LambangDesa } from '@/ui/domain/LambangDesa'
import { useMediaQuery } from '@/ui/hooks/useMediaQuery'
import { Hitungan } from '@/ui/hitungan/Hitungan'
import { Drawer } from '@/ui/lapisan/Drawer'
import { pasangFavicon } from '@/ui/website/favicon'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { LABEL_HITUNGAN, menuAktif, menuBawahUntuk, menuUntuk, type ItemMenu, type KunciHitungan } from './navigasi'

type Props = {
  sesi: SesiAdmin
  jalur: string
  onCari: () => void
  onKeluar: () => void
  /** Angka di samping menu; nol atau kosong tidak ditampilkan. */
  hitungan?: Partial<Record<KunciHitungan, number>>
  children: ReactNode
}

/** Garis 3 px warna aksen desa di tepi atas sidebar atau bilah atas HP (rencana 7E-1); dekoratif. */
function GarisAksen({ sesi }: { sesi: SesiAdmin }) {
  const aksen = sesi.tampilanPanel?.warnaAksen
  if (!aksen) return null
  return <div aria-hidden data-garis-aksen className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: aksen }} />
}

const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

function TautanMenu({ item: i, jalur, onPilih, hitungan }: { item: ItemMenu; jalur: string; onPilih?: () => void; hitungan?: Props['hitungan'] }) {
  const aktif = menuAktif(i, jalur)
  const angka = i.hitungan ? hitungan?.[i.hitungan] : undefined
  return (
    <Link
      href={i.href}
      onPress={onPilih}
      aria-current={aktif ? 'page' : undefined}
      aria-label={angka && i.hitungan ? `${i.label}, ${formatAngka(angka)} ${LABEL_HITUNGAN[i.hitungan]}` : undefined}
      className={cn(
        'flex h-9 items-center rounded-1 border-l-2 px-2 text-teks',
        aktif ? 'border-biru bg-lembar font-medium text-tinta' : 'border-transparent text-tinta-2 hover:bg-lembar hover:text-tinta',
        fokus,
      )}
    >
      <span className="min-w-0 flex-1 truncate">{i.label}</span>
      {angka !== undefined && angka > 0 && <Hitungan nilai={angka} className="ml-2 text-tinta" />}
    </Link>
  )
}

function IsiNavigasi({ sesi, jalur, onCari, onKeluar, onPilih, hitungan }: Omit<Props, 'children'> & { onPilih?: () => void }) {
  const { desa, pengguna } = sesi
  return (
    <div className="flex h-full flex-col gap-5 px-4 py-5">
      <div className="flex items-center gap-3">
        <LambangDesa nama={desa.nama} gambar={desa.lambang} />
        <div className="min-w-0">
          <p className="truncate font-serif font-medium">Desa {desa.nama}</p>
          <p className="truncate text-teks-kecil text-tinta-2">
            {desa.kecamatan.nama} · {desa.kabupaten.nama}
          </p>
        </div>
      </div>
      <Button
        onPress={() => {
          onPilih?.()
          onCari()
        }}
        className={cn(
          'flex h-9 items-center gap-2 rounded-1 border border-garis-input bg-lembar px-3 text-left text-teks-kecil text-tinta-2 hover:text-tinta',
          fokus,
        )}
      >
        <MagnifyingGlass aria-hidden size={14} />
        <span className="min-w-0 flex-1 truncate">Cari NIK, nama, nomor KK…</span>
        <kbd className="shrink-0 font-mono text-label">Ctrl K</kbd>
      </Button>
      <nav aria-label="Menu utama" className="flex-1 overflow-y-auto">
        {menuUntuk(pengguna.peran, desa.status).map((k) => (
          <div key={k.judul ?? 'utama'} className="mb-4">
            {k.judul && <p className="mb-1 px-2 text-label font-medium text-tinta-2 uppercase">{k.judul}</p>}
            <ul>
              {k.item.map((i) => (
                <li key={i.href}>
                  <TautanMenu item={i} jalur={jalur} onPilih={onPilih} hitungan={hitungan} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <nav aria-label="Menu lain" className="border-t border-garis pt-3">
        <ul>
          {menuBawahUntuk(pengguna.peran, desa.status).map((i) => (
            <li key={i.href}>
              <TautanMenu item={i} jalur={jalur} onPilih={onPilih} hitungan={hitungan} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-garis pt-4">
        <MenuAksi
          placement="top start"
          pemicu={
            <Button className={cn('min-w-0 rounded-1 px-2 py-1 text-left hover:bg-lembar', fokus)}>
              <span className="block truncate font-medium">{pengguna.nama}</span>
              <span className="block truncate text-teks-kecil text-tinta-2">{LABEL_PERAN[pengguna.peran]}</span>
            </Button>
          }
          items={[{ id: 'keluar', label: 'Keluar', onAction: onKeluar }]}
        />
        <img src={logoMark} alt="Sinfodes" className="h-6 w-auto" />
      </div>
    </div>
  )
}

/** Kerangka panel admin (SPEC §5.2, §5.7): sidebar ≥ 1024px, bar atas + laci di layar lebih kecil. */
export function AdminShell({ children, ...nav }: Props) {
  const lebar = useMediaQuery('(min-width: 1024px)')
  // Favicon lambang desa selama panel terbuka; favicon Sinfodes kembali saat panel dilepas.
  const panel = nav.sesi.tampilanPanel
  const faviconLambang = panel?.favicon ?? null
  const adaPanel = panel !== undefined
  const namaDesa = nav.sesi.desa.nama
  useEffect(() => (adaPanel ? pasangFavicon(faviconLambang, namaDesa) : undefined), [adaPanel, faviconLambang, namaDesa])
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
        <aside className="sticky top-0 h-screen w-[216px] shrink-0 border-r border-garis bg-kertas-2 xl:w-[240px] print:hidden">
          <GarisAksen sesi={nav.sesi} />
          <IsiNavigasi {...nav} />
        </aside>
      ) : (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-garis bg-kertas-2 px-4 print:hidden">
          <GarisAksen sesi={nav.sesi} />
          <LambangDesa nama={nav.sesi.desa.nama} gambar={nav.sesi.desa.lambang} />
          <p className="min-w-0 flex-1 truncate font-serif font-medium">Desa {nav.sesi.desa.nama}</p>
          <Button aria-label="Cari" onPress={nav.onCari} className={cn('rounded-1 p-2', fokus)}>
            <MagnifyingGlass aria-hidden size={18} />
          </Button>
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
