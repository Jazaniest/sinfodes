import { Baby, ChatCircleText, FilePlus, SealCheck } from '@phosphor-icons/react'
import { Link } from 'react-aria-components'
import type { BlokTampil } from '@/domain/publik/schema'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

const IKON = { size: 28, 'aria-hidden': true } as const

type Props = { blok: Extract<BlokTampil, { jenis: 'layanan' }>; dasar: string }

/** Layanan cepat (SPEC-V0.2 11.4): empat pintu layanan tetap; `kisi` seperti Warta v0.1, `daftar` berbaris penuh. */
export function BlokLayanan({ blok, dasar }: Props) {
  const daftar = [
    { judul: 'Ajukan surat online', keterangan: 'Dari HP, tanpa antre', href: '/warga/ajukan', ikon: <FilePlus {...IKON} /> },
    { judul: 'Cek keaslian surat', keterangan: 'Pindai QR atau ketik kodenya', href: `${dasar}/verifikasi`, ikon: <SealCheck {...IKON} /> },
    { judul: 'Sampaikan pengaduan', keterangan: 'Dibaca dan dibalas petugas desa', href: '/warga/pengaduan/baru', ikon: <ChatCircleText {...IKON} /> },
    { judul: 'Jadwal posyandu', keterangan: 'Di setiap dusun', href: `${dasar}/layanan#posyandu`, ikon: <Baby {...IKON} /> },
  ]
  return (
    <WadahBlok blok={blok}>
      <Rubrik id={blok.id} judul="Layanan cepat">
        <ul className={blok.varian === 'kisi' ? 'grid grid-cols-2 gap-3 lg:grid-cols-4' : 'flex flex-col gap-3'}>
          {daftar.map((l) => (
            <li key={l.judul}>
              <Link
                href={l.href}
                className={
                  blok.varian === 'kisi'
                    ? 'flex h-full min-h-28 flex-col gap-1.5 rounded-2 border border-garis bg-lembar p-3 outline-none hover:border-biru data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'
                    : 'flex items-center gap-3 rounded-2 border border-garis bg-lembar p-3 outline-none hover:border-biru data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'
                }
              >
                <span className="text-biru">{l.ikon}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{l.judul}</span>
                  <span className="text-teks-kecil text-tinta-2">{l.keterangan}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Rubrik>
    </WadahBlok>
  )
}
