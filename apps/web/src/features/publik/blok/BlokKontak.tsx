import { tautanWhatsapp } from '@/domain/format/whatsapp'
import type { BlokTampil } from '@/domain/publik/schema'
import { formatWhatsapp } from '@/domain/warga/akun'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'kontak' }> }

/** Kontak dan jam layanan kantor desa (SPEC-V0.2 11.4): `kolom` berkelompok, `ringkas` satu paragraf padat. */
export function BlokKontak({ blok }: Props) {
  const { nama, alamatKantor, telepon, surel, jamLayanan } = blok.data
  const wa = tautanWhatsapp(telepon)
  return (
    <WadahBlok blok={blok}>
      <Rubrik id={blok.id} judul="Kontak & jam layanan">
        {blok.varian === 'ringkas' ? (
          <p className="text-baca text-tinta-2">
            Kantor Desa {nama}, {alamatKantor}. Buka {jamLayanan.map((j) => `${j.hari} ${j.buka}-${j.tutup} WIB`).join(', ')}.{' '}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-biru underline underline-offset-2">
              {formatWhatsapp(telepon)}
              <span className="sr-only"> (membuka situs lain)</span>
            </a>{' '}
            · {surel}
          </p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-label font-semibold tracking-wide text-tinta-2 uppercase">Alamat</dt>
              <dd className="text-baca">
                Kantor Desa {nama}
                <br />
                {alamatKantor}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-label font-semibold tracking-wide text-tinta-2 uppercase">Jam layanan</dt>
              <dd className="text-baca">
                {jamLayanan.map((j) => (
                  <span key={j.hari} className="block">
                    {j.hari} {j.buka}-{j.tutup} WIB
                  </span>
                ))}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-label font-semibold tracking-wide text-tinta-2 uppercase">Hubungi</dt>
              <dd className="text-baca">
                <a href={wa} target="_blank" rel="noopener noreferrer" className="text-biru underline underline-offset-2">
                  {formatWhatsapp(telepon)}
                  <span className="sr-only"> (membuka situs lain)</span>
                </a>
                <br />
                <a href={`mailto:${surel}`} className="text-biru underline underline-offset-2">
                  {surel}
                </a>
              </dd>
            </div>
          </dl>
        )}
      </Rubrik>
    </WadahBlok>
  )
}
