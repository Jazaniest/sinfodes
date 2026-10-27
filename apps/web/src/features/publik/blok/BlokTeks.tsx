import type { BlokTampil } from '@/domain/publik/schema'
import { WadahBlok } from './RenderSusunan'
import { TautanIsi } from './TautanIsi'

type Props = { blok: Extract<BlokTampil, { jenis: 'teks' }> }

/** Teks bebas dari desa (SPEC-V0.2 11.4): judul, paragraf, dan satu tautan; `sorot` dibingkai panel penekan. */
export function BlokTeks({ blok }: Props) {
  const { judul, paragraf, tautan } = blok.isi
  const isi = (
    <>
      {judul.trim() !== '' && <h2 className="font-serif text-judul-bagian font-medium">{judul}</h2>}
      {paragraf
        .filter((p) => p.trim() !== '')
        .map((p, i) => (
          <p key={i} className="text-baca text-tinta-2">
            {p}
          </p>
        ))}
      {tautan && (
        <p>
          <TautanIsi href={tautan.url} className="text-biru underline underline-offset-2">
            {tautan.label.trim() === '' ? tautan.url : tautan.label}
          </TautanIsi>
        </p>
      )}
    </>
  )
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'sorot' ? (
        <div className="flex flex-col gap-2 rounded-2 border-l-2 border-biru bg-lembar p-5">{isi}</div>
      ) : (
        <div className="flex max-w-[60ch] flex-col gap-2">{isi}</div>
      )}
    </WadahBlok>
  )
}
