import type { BlokTampil } from '@/domain/publik/schema'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'galeri' }> }

/** Galeri foto desa (SPEC-V0.2 11.4): `kisi` bingkai foto berjajar, `geser` deret mendatar berperekat gulir. */
export function BlokGaleri({ blok }: Props) {
  const { foto } = blok.data
  if (foto.length === 0) return null
  return (
    <WadahBlok blok={blok}>
      <Rubrik id={blok.id} judul="Galeri foto">
        {blok.varian === 'geser' ? (
          <ul className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
            {foto.map((f, i) => (
              <li key={`${f.berkas}-${i}`} className="w-64 shrink-0 snap-start sm:w-80">
                <FotoWarta berkas={f.berkas} alt={f.keterangan} keterangan={f.keterangan} kredit={f.kredit} rasio="foto" sizes="(min-width: 40rem) 20rem, 80vw" className="w-full rounded-1" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {foto.map((f, i) => (
              <li key={`${f.berkas}-${i}`}>
                <FotoWarta berkas={f.berkas} alt={f.keterangan} keterangan={f.keterangan} kredit={f.kredit} rasio="foto" sizes="(min-width: 40rem) 20rem, 50vw" className="w-full rounded-1" />
              </li>
            ))}
          </ul>
        )}
      </Rubrik>
    </WadahBlok>
  )
}
