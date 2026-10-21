import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiHalamanTambahan } from '@/api/publik'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { RenderSusunan } from '../blok/RenderSusunan'
import { usePublik } from '../publik-konteks'

const rute = getRouteApi('/desa/$slug/halaman/$nama')

/** Pembungkus rute: nama halaman dari alamat. */
export function RuteHalamanTambahan() {
  const { nama } = rute.useParams()
  return <HalamanTambahan nama={nama} />
}

/**
 * Halaman tambahan website desa (SPEC-V0.2 11.4): judul halaman lalu susunan bloknya, sama seperti beranda. Nama yang
 * tidak dikenal mendapat halaman "tidak ditemukan" di dalam kerangka website desa.
 */
export function HalamanTambahan({ nama }: { nama: string }) {
  const identitas = usePublik()
  const kueri = useQuery(opsiHalamanTambahan(identitas.slug, nama))
  const dasar = `/desa/${identitas.slug}`
  const tidakDitemukan = kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND'
  return (
    <div className="flex flex-col gap-[var(--desa-jarak,2.5rem)]">
      {kueri.isPending && <BarisKerangka jumlah={4} label="Memuat halaman…" />}
      {kueri.isError && tidakDitemukan && (
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-judul-halaman font-medium">Halaman tidak ditemukan</h1>
          <p className="text-tinta-2">Halaman ini belum dibuat, atau sudah dihapus oleh desa.</p>
          <p>
            <Tautan href={dasar}>Kembali ke Beranda</Tautan>
          </p>
        </div>
      )}
      {kueri.isError && !tidakDitemukan && (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      )}
      {kueri.isSuccess && (
        <>
          <h1 className="font-serif text-judul-halaman font-medium">{kueri.data.judul}</h1>
          <RenderSusunan blok={kueri.data.blok} dasar={dasar} />
        </>
      )}
    </div>
  )
}
