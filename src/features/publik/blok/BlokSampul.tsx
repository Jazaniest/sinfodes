import type { BlokTampil } from '@/domain/publik/schema'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'sampul' }> }

/** Sampul beranda (SPEC-V0.2 11.4): nama desa dan kalimat sambutan, dengan foto besar, foto di samping, atau tanpa foto. */
export function BlokSampul({ blok }: Props) {
  const { nama, sampul } = blok.data
  const kalimat = blok.isi.kalimat.trim()
  const Teks = (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-judul-halaman font-medium sm:text-judul-warta">Desa {nama}</h2>
      {kalimat !== '' && <p className="max-w-[48ch] text-baca text-tinta-2">{kalimat}</p>}
    </div>
  )
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'foto-besar' && sampul && (
        <div className="flex flex-col gap-4">
          <FotoWarta berkas={sampul.berkas} alt={sampul.keterangan} keterangan={sampul.keterangan} kredit={sampul.kredit} sizes="100vw" utama />
          {Teks}
        </div>
      )}
      {blok.varian === 'foto-samping' && (
        <div className="grid items-center gap-4 sm:grid-cols-2">
          {sampul && <FotoWarta berkas={sampul.berkas} alt={sampul.keterangan} kredit={sampul.kredit} rasio="foto" sizes="(min-width: 40rem) 30rem, 100vw" className="w-full rounded-1" />}
          {Teks}
        </div>
      )}
      {(blok.varian === 'tanpa-foto' || (blok.varian === 'foto-besar' && !sampul)) && (
        <div className="rounded-2 border border-garis bg-lembar p-6 sm:p-10">{Teks}</div>
      )}
    </WadahBlok>
  )
}
