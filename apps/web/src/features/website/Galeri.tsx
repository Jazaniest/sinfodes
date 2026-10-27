import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiGaleri } from '@/api/website'
import { ALBUM_GALERI } from '@/domain/website/schema'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaWebsite } from './TabWebsite'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/**
 * Galeri foto website (SPEC §8, §9). Foto disiapkan lewat kurasi: hanya foto berlisensi bebas yang disetujui desa,
 * tanpa foto buatan AI (K8). Sampai saat itu tiap foto yang direncanakan tampil sebagai bingkai kosong.
 */
export function Galeri() {
  const kueri = useQuery(opsiGaleri())
  const foto = kueri.data?.data
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="galeri" />
      {kueri.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat galeri…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <>
          <p className="max-w-2xl text-tinta-2">
            Bingkai di bawah adalah foto yang dibutuhkan website desa. Foto diunggah setelah dipilih dan disetujui desa.
          </p>
          {ALBUM_GALERI.map((album) => {
            const isi = foto?.filter((f) => f.album === album) ?? []
            if (isi.length === 0) return null
            const id = `album-${album.toLowerCase().replace(/\s+/g, '-')}`
            return (
              <section key={album} aria-labelledby={id}>
                <h2 id={id} className={judulBagian}>
                  {album}
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {isi.map((f) => (
                    <li key={f.id}>
                      <figure>
                        {f.tersedia ? (
                          <img src={f.berkas} alt={f.judul} loading="lazy" className="aspect-[4/3] w-full rounded-1 object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center rounded-1 border border-dashed border-garis-input bg-kertas-2 px-3 text-center text-teks-kecil text-tinta-2">
                            Belum ada foto
                          </div>
                        )}
                        <figcaption className="mt-1.5 text-teks-kecil">{f.judul}</figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
