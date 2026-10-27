import { formatTanggal } from '@/domain/format/tanggal'
import type { BlokTampil } from '@/domain/publik/schema'
import { Tautan } from '@/ui/navigasi/Tautan'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { KartuKabar } from '../kabar/KartuKabar'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'kabar' }>; dasar: string }

/** Kabar terbaru (SPEC-V0.2 11.4): `sorotan` satu berita utama, `daftar` baris seperti kolom Warta v0.1, `kartu` berbingkai foto. */
export function BlokKabar({ blok, dasar }: Props) {
  const artikel = blok.data.artikel
  if (artikel.length === 0) return null
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'sorotan' ? (
        <BeritaSorotan a={artikel[0]} dasar={dasar} />
      ) : (
        <Rubrik
          id={blok.id}
          judul="Kabar terbaru"
          aksi={
            <Tautan href={`${dasar}/kabar`} className="text-teks-kecil">
              Semua kabar
            </Tautan>
          }
        >
          {blok.varian === 'kartu' ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {artikel.map((a) => (
                <li key={a.slug}>
                  <article aria-labelledby={`kabar-${a.slug}`} className="flex flex-col gap-1.5">
                    {a.foto && (
                      <FotoWarta
                        berkas={a.foto.berkas}
                        alt=""
                        rasio="foto"
                        sizes="(min-width: 64rem) 20rem, (min-width: 40rem) 45vw, 100vw"
                        className="w-full rounded-1"
                      />
                    )}
                    <p className="text-label font-medium tracking-wide text-tinta-2 uppercase">
                      {a.kategori} · {formatTanggal(a.tanggal, 'pendek')}
                    </p>
                    <h3 id={`kabar-${a.slug}`} className="font-serif text-judul-bagian font-medium">
                      <Tautan href={`${dasar}/kabar/${a.slug}`} nada="tinta">
                        {a.judul}
                      </Tautan>
                    </h3>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-5">
              {artikel.map((a) => (
                <KartuKabar key={a.slug} a={a} dasar={dasar} />
              ))}
            </div>
          )}
        </Rubrik>
      )}
    </WadahBlok>
  )
}

function BeritaSorotan({ a, dasar }: { a: Props['blok']['data']['artikel'][number]; dasar: string }) {
  return (
    <article aria-labelledby={`berita-utama-${a.slug}`} className="flex flex-col gap-3">
      {a.foto && (
        <FotoWarta
          berkas={a.foto.berkas}
          alt={a.foto.keterangan}
          keterangan={a.foto.keterangan}
          kredit={a.foto.kredit}
          sizes="(min-width: 64rem) 60rem, 100vw"
          utama
        />
      )}
      <p className="text-label font-semibold tracking-wide text-biru uppercase">
        {a.kategori} · {formatTanggal(a.tanggal)}
      </p>
      <h2 id={`berita-utama-${a.slug}`} className="font-serif text-judul-halaman font-medium sm:text-judul-warta">
        <Tautan href={`${dasar}/kabar/${a.slug}`} nada="tinta">
          {a.judul}
        </Tautan>
      </h2>
      <p className="max-w-[56ch] text-baca text-tinta-2">{a.ringkasan}</p>
    </article>
  )
}
