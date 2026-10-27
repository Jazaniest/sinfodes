import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKwitansiKonsol, opsiTagihanKonsol } from '@/api/konsol'
import { REKENING_SINFODES } from '@/app/kontak-sinfodes'
import type { TagihanCetak } from '@/domain/langganan/schema'
import { KerangkaCetak } from '@/features/langganan/KerangkaCetak'
import { LembarKwitansi } from '@/features/langganan/LembarKwitansi'
import { LembarTagihan } from '@/features/langganan/LembarTagihan'
import { Tautan } from '@/ui/navigasi/Tautan'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const ruteTagihan = getRouteApi('/konsol/_konsol/tagihan/$id_/tagihan')
const ruteKwitansi = getRouteApi('/konsol/_konsol/tagihan/$id_/kwitansi')

function Galat({ error, ulang }: { error: unknown; ulang: () => void }) {
  if (error instanceof GalatApi && error.kode === 'NOT_FOUND') {
    return (
      <div className="flex flex-col items-start gap-3">
        <EmptyState judul="Dokumen tidak ditemukan" keterangan={error.message} />
        <Tautan href="/konsol/tagihan">Kembali ke Tagihan</Tautan>
      </div>
    )
  }
  return <ErrorState pesan={pesanGalat(error)} onCobaLagi={ulang} />
}

/** Dokumen tagihan yang sama dengan yang diunduh desa, dari data Konsol. */
export function HalamanCetakTagihanKonsol() {
  const { id } = ruteTagihan.useParams()
  const kueri = useQuery(opsiTagihanKonsol(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Menyiapkan tagihan…" />
  if (kueri.isError) return <Galat error={kueri.error} ulang={() => void kueri.refetch()} />
  const t = kueri.data
  const cetak: TagihanCetak = {
    ...t,
    desa: { nama: t.desa.nama, kecamatan: t.desa.kecamatan, kabupaten: t.desa.kabupaten, alamatKantor: t.desa.alamatKantor },
    rekening: { ...REKENING_SINFODES },
  }
  return (
    <KerangkaCetak kembali={{ label: 'Detail tagihan', href: `/konsol/tagihan/${encodeURIComponent(id)}` }}>
      <LembarTagihan tagihan={cetak} />
    </KerangkaCetak>
  )
}

export function HalamanCetakKwitansiKonsol() {
  const { id } = ruteKwitansi.useParams()
  const kueri = useQuery(opsiKwitansiKonsol(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Menyiapkan kwitansi…" />
  if (kueri.isError) return <Galat error={kueri.error} ulang={() => void kueri.refetch()} />
  return (
    <KerangkaCetak kembali={{ label: 'Detail tagihan', href: `/konsol/tagihan/${encodeURIComponent(id)}` }}>
      <LembarKwitansi kwitansi={kueri.data} />
    </KerangkaCetak>
  )
}
