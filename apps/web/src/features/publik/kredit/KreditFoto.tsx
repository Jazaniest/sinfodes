import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiKreditFotoPublik } from '@/api/publik'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { usePublik } from '../publik-konteks'

/** Kredit foto (SPEC §9, K8): judul asli bertaut ke sumbernya, pembuat, dan lisensi setiap foto di website. */
export function KreditFoto() {
  const { slug } = usePublik()
  const kueri = useQuery(opsiKreditFotoPublik(slug))
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">Kredit foto</h1>
        <p className="text-tinta-2">
          Foto di website ini berlisensi bebas dari Wikimedia Commons; terima kasih kepada para fotografernya. Foto kantor desa
          dan kegiatan warga dipakai sebagai ilustrasi.
        </p>
      </div>
      {kueri.isPending && <BarisKerangka jumlah={6} label="Memuat kredit foto…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && (
        <ul className="flex flex-col divide-y divide-garis border-y border-garis bg-lembar">
          {kueri.data.map((f) => (
            <li key={f.berkas} className="flex gap-3 px-4 py-3">
              <FotoWarta berkas={f.berkas} alt="" rasio="foto" sizes="6rem" className="w-24 shrink-0 self-start rounded-1" />
              <div className="flex min-w-0 flex-col gap-0.5 text-teks-kecil">
                <p className="text-teks font-medium">{f.keterangan}</p>
                <p>
                  Judul asli:{' '}
                  <Tautan href={f.sumber} target="_blank" rel="noopener noreferrer" className="break-all">
                    {f.judulAsli}
                  </Tautan>
                </p>
                <p>
                  Pembuat: <span>{f.pembuat}</span>
                </p>
                <p>
                  Lisensi:{' '}
                  <Tautan href={f.tautanLisensi} target="_blank" rel="noopener noreferrer">
                    {f.lisensi}
                  </Tautan>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
