import { useState } from 'react'
import { idVideoYoutube } from '@/domain/website/blok'
import type { BlokTampil } from '@/domain/publik/schema'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'video' }> }

/**
 * Video YouTube (SPEC-V0.2 11.4): pratinjau dari i.ytimg.com dengan tombol Putar; iframe youtube-nocookie baru dimuat
 * setelah tombol ditekan, sehingga tidak ada permintaan ke YouTube sebelum pengunjung menghendakinya.
 */
export function BlokVideo({ blok }: Props) {
  const [putar, setPutar] = useState(false)
  const id = idVideoYoutube(blok.isi.url)
  if (id === null) return null
  const judul = blok.isi.judul.trim()
  return (
    <WadahBlok blok={blok}>
      <div className="relative aspect-video overflow-hidden rounded-2 border border-garis bg-kertas-2">
        {putar ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={judul === '' ? 'Video' : judul}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPutar(true)}
            className="group relative block h-full w-full outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-[-4px] data-[focus-visible]:outline-biru"
          >
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-tinta/40 transition-colors group-data-[hovered]:bg-tinta/50">
              <span className="rounded-2 bg-white px-4 py-2 font-medium text-biru">
                Putar video{judul === '' ? '' : `: ${judul}`}
              </span>
            </span>
          </button>
        )}
      </div>
    </WadahBlok>
  )
}
