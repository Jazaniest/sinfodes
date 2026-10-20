import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKwitansiDesa } from '@/api/langganan'
import { Tautan } from '@/ui/navigasi/Tautan'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { ButuhAkses } from '../admin/ButuhAkses'
import { KerangkaCetak } from '../langganan/KerangkaCetak'
import { LembarKwitansi } from '../langganan/LembarKwitansi'

const KEMBALI = '/admin/pengaturan/langganan'

export function IsiCetakKwitansi({ id }: { id: string }) {
  const kueri = useQuery(opsiKwitansiDesa(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Menyiapkan kwitansi…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <div className="flex flex-col items-start gap-3">
          <EmptyState judul="Kwitansi belum tersedia" keterangan="Kwitansi terbit setelah pembayaran diverifikasi Tim Sinfodes." />
          <Tautan href={KEMBALI}>Kembali ke Langganan</Tautan>
        </div>
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return (
    <KerangkaCetak kembali={{ label: 'Langganan', href: KEMBALI }}>
      <LembarKwitansi kwitansi={kueri.data} />
    </KerangkaCetak>
  )
}

const rute = getRouteApi('/admin/_panel/pengaturan/langganan_/kwitansi/$id')

export function HalamanCetakKwitansi() {
  const { id } = rute.useParams()
  return (
    <ButuhAkses kemampuan="langganan.lihat">
      <IsiCetakKwitansi id={id} />
    </ButuhAkses>
  )
}
