import { Link } from 'react-aria-components'
import type { BlokTampil } from '@/domain/publik/schema'
import { Tautan } from '@/ui/navigasi/Tautan'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'potensi' }>; dasar: string }

/** Potensi desa (SPEC-V0.2 11.4): `kartu` foto dan judul seperti Warta v0.1, `daftar` ringkas berbaris. */
export function BlokPotensi({ blok, dasar }: Props) {
  const { potensi } = blok.data
  if (potensi.length === 0) return null
  return (
    <WadahBlok blok={blok}>
      <Rubrik
        id={blok.id}
        judul="Potensi desa"
        aksi={
          <Tautan href={`${dasar}/potensi`} className="text-teks-kecil">
            Potensi dan UMKM
          </Tautan>
        }
      >
        {blok.varian === 'daftar' ? (
          <ul className="flex flex-col gap-3">
            {potensi.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 border-b border-garis pb-2 last:border-b-0">
                <Link
                  href={`${dasar}/potensi#${p.id}`}
                  className="min-w-0 font-medium outline-none hover:underline data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
                >
                  {p.judul}
                </Link>
                <span className="text-label font-semibold tracking-wide text-tinta-2 uppercase">{p.kategori}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {potensi.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${dasar}/potensi#${p.id}`}
                  className="group flex flex-col gap-1.5 rounded-1 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
                >
                  {p.foto && (
                    <FotoWarta
                      berkas={p.foto.berkas}
                      alt=""
                      rasio="foto"
                      sizes="(min-width: 64rem) 13rem, (min-width: 40rem) 30vw, 50vw"
                      className="w-full rounded-1"
                    />
                  )}
                  <span className="text-label font-semibold tracking-wide text-tinta-2 uppercase">{p.kategori}</span>
                  <span className="font-medium group-data-[hovered]:text-biru group-data-[hovered]:underline">{p.judul}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Rubrik>
    </WadahBlok>
  )
}
