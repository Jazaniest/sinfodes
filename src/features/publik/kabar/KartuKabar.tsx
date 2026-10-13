import { formatTanggal } from '@/domain/format/tanggal'
import type { RingkasArtikel } from '@/domain/publik/schema'
import { Tautan } from '@/ui/navigasi/Tautan'
import { FotoWarta } from '@/ui/website/FotoWarta'

type Props = {
  a: RingkasArtikel
  /** Alamat dasar website, mis. "/desa/sungai-sialang". */
  dasar: string
  /** Tingkat judul: 3 di bawah rubrik Beranda, 2 di halaman Kabar. */
  tingkat?: 2 | 3
}

/** Satu kabar di daftar: foto kecil bila ada, kategori dan tanggal, judul bertaut, dan ringkasan. */
export function KartuKabar({ a, dasar, tingkat = 3 }: Props) {
  const Judul = tingkat === 2 ? 'h2' : 'h3'
  const id = `kabar-${a.slug}`
  return (
    <article aria-labelledby={id} className="flex gap-3">
      {a.foto && <FotoWarta berkas={a.foto.berkas} alt="" rasio="foto" sizes="7rem" className="w-24 shrink-0 self-start rounded-1 sm:w-32" />}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-label font-medium tracking-wide text-tinta-2 uppercase">
          {a.kategori} · {formatTanggal(a.tanggal, 'pendek')}
        </p>
        <Judul id={id} className="font-serif text-judul-bagian font-medium">
          <Tautan href={`${dasar}/kabar/${a.slug}`} nada="tinta">
            {a.judul}
          </Tautan>
        </Judul>
        <p className="text-tinta-2">{a.ringkasan}</p>
      </div>
    </article>
  )
}
