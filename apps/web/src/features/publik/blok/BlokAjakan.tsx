import type { BlokTampil } from '@/domain/publik/schema'
import { WadahBlok } from './RenderSusunan'
import { TautanIsi } from './TautanIsi'

type Props = { blok: Extract<BlokTampil, { jenis: 'ajakan' }> }

/** Ajakan bertindak (SPEC-V0.2 11.4): judul dan tombol ke sebuah halaman; `pita` melebar penuh, `kotak` berbingkai. */
export function BlokAjakan({ blok }: Props) {
  const { judul, tombol } = blok.isi
  const href = blok.data.href
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'pita' ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2 bg-biru px-6 py-5">
          {judul.trim() !== '' && <p className="font-serif text-judul-bagian font-medium text-white">{judul}</p>}
          <TautanIsi href={href} className="rounded-2 bg-white px-4 py-2 font-medium text-biru">
            {tombol}
          </TautanIsi>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2 border border-garis bg-lembar p-6">
          {judul.trim() !== '' && <p className="font-serif text-judul-bagian font-medium">{judul}</p>}
          <TautanIsi href={href} className="rounded-2 bg-biru px-4 py-2 font-medium text-white">
            {tombol}
          </TautanIsi>
        </div>
      )}
    </WadahBlok>
  )
}
