import { keAlamat } from '@/app/alamat'
import type { BlokTampil } from '@/domain/publik/schema'
import { CapLencana } from '@/ui/website/Lencana'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'lencana' }> }

/** Lencana juara (SPEC-V0.2 11.4 & 9.6): `deret` seperti Warta v0.1, `daftar` berbaris dengan keterangan. */
export function BlokLencana({ blok }: Props) {
  const { lencana } = blok.data
  if (lencana.length === 0) return null
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'deret' ? (
        <section data-bagian="lencana" aria-label="Lencana juara">
          <ul className="flex flex-wrap gap-3">
            {lencana.map((l) => (
              <li key={l.kode} className="min-w-0">
                <CapLencana lencana={l} href={keAlamat({ jenis: 'induk' }, `/lencana/${l.kode}`)} varian="website" />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {lencana.map((l) => (
            <li key={l.kode} className="min-w-0">
              <CapLencana lencana={l} href={keAlamat({ jenis: 'induk' }, `/lencana/${l.kode}`)} varian="website" kecil />
            </li>
          ))}
        </ul>
      )}
    </WadahBlok>
  )
}
