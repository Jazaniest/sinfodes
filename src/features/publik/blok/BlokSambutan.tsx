import type { BlokTampil } from '@/domain/publik/schema'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'sambutan' }> }

/** Sambutan Kepala Desa (SPEC-V0.2 11.4): `foto-kiri` potret di samping teks, `kutipan` sebagai blok kutipan. */
export function BlokSambutan({ blok }: Props) {
  const { nama, jabatan, foto, teks } = blok.isi
  const keterangan = [nama.trim(), jabatan.trim()].filter(Boolean).join(' · ')
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'kutipan' ? (
        <figure className="flex flex-col gap-2 rounded-2 border-l-2 border-biru bg-lembar p-5">
          <blockquote className="font-serif text-judul-bagian">{teks}</blockquote>
          {keterangan !== '' && <figcaption className="text-teks-kecil text-tinta-2">{keterangan}</figcaption>}
        </figure>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-[12rem_1fr]">
          {foto && <FotoWarta berkas={foto} alt={`Foto ${nama.trim()}`} rasio="foto" sizes="12rem" className="w-full rounded-1" />}
          <div className="flex flex-col gap-2">
            <p className="text-baca">{teks}</p>
            {keterangan !== '' && <p className="text-teks-kecil text-tinta-2">{keterangan}</p>}
          </div>
        </div>
      )}
    </WadahBlok>
  )
}
