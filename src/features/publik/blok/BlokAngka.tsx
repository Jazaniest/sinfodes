import { kalimatAngkaDesa } from '@/domain/publik/angka'
import type { BlokTampil } from '@/domain/publik/schema'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'angka' }> }

/** Angka desa (SPEC-V0.2 11.4): `kalimat` seperti Warta v0.1, `besar` empat angka pokok berukuran besar. */
export function BlokAngka({ blok }: Props) {
  const { nama, angka, sampul } = blok.data
  return (
    <WadahBlok blok={blok}>
      <Rubrik id={blok.id} judul="Desa dalam angka">
        {blok.varian === 'besar' ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Jiwa', angka.jiwa.toLocaleString('id-ID')],
              ['Keluarga', angka.kk.toLocaleString('id-ID')],
              ['Dusun', String(angka.dusun)],
              ['RT', String(angka.rt)],
            ].map(([label, nilai]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-label font-semibold tracking-wide text-tinta-2 uppercase">{label}</dt>
                <dd className="font-serif text-judul-halaman font-medium">{nilai}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="grid items-start gap-4 sm:grid-cols-2">
            {sampul && (
              <div data-bagian="sampul">
                <FotoWarta
                  berkas={sampul.berkas}
                  alt={sampul.keterangan}
                  keterangan={sampul.keterangan}
                  kredit={sampul.kredit}
                  sizes="(min-width: 40rem) 30rem, 100vw"
                />
              </div>
            )}
            <p className="font-serif text-judul-bagian">{kalimatAngkaDesa(nama, angka)}</p>
          </div>
        )}
      </Rubrik>
    </WadahBlok>
  )
}
