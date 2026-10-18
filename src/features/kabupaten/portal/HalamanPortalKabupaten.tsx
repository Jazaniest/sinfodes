import { useQuery } from '@tanstack/react-query'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiPortalKabupaten } from '@/api/kabupaten'
import { HalamanAlamatTidakDikenal } from '@/features/alamat/HalamanAlamatTidakDikenal'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { PortalKabupaten } from './PortalKabupaten'

/** Pembungkus rute `/` di alamat kabupaten: data portal dari alamatnya. */
export function HalamanPortalKabupaten() {
  const kueri = useQuery(opsiPortalKabupaten())
  if (kueri.isPending) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <BarisKerangka jumlah={4} label="Memuat portal kabupaten…" />
      </main>
    )
  }
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') return <HalamanAlamatTidakDikenal />
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <ErrorState judul="Portal kabupaten tidak dapat dibuka" pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      </main>
    )
  }
  return <PortalKabupaten portal={kueri.data} />
}
