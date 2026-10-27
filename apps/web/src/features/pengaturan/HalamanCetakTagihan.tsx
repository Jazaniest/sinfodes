import { Printer } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiTagihanCetak } from '@/api/langganan'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { ButuhAkses } from '../admin/ButuhAkses'
import { LembarTagihan } from '../langganan/LembarTagihan'

const KEMBALI = '/admin/pengaturan/langganan'

/**
 * Pratinjau tagihan di layar yang sama dengan hasil cetaknya, lalu dialog cetak peramban ("Simpan sebagai PDF" ada di sana),
 * seperti laporan bulanan kabupaten. Kerangka panel disembunyikan saat cetak.
 */
export function IsiCetakTagihan({ id }: { id: string }) {
  const kueri = useQuery(opsiTagihanCetak(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Menyiapkan tagihan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <div className="flex flex-col items-start gap-3">
          <EmptyState judul="Tagihan tidak ditemukan" keterangan="Tagihan ini tidak ada atau bukan milik desa Anda." />
          <Tautan href={KEMBALI}>Kembali ke Langganan</Tautan>
        </div>
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Tautan href={KEMBALI} nada="redup" className="text-label font-medium uppercase">
          Langganan
        </Tautan>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-teks-kecil text-tinta-2">Pilih “Simpan sebagai PDF” di jendela cetak.</p>
          <Tombol varian="utama" ikon={<Printer aria-hidden size={16} />} onPress={() => window.print()}>
            Cetak atau simpan PDF
          </Tombol>
        </div>
      </div>
      <LembarTagihan tagihan={kueri.data} />
    </div>
  )
}

const rute = getRouteApi('/admin/_panel/pengaturan/langganan_/tagihan/$id')

export function HalamanCetakTagihan() {
  const { id } = rute.useParams()
  return (
    <ButuhAkses kemampuan="langganan.lihat">
      <IsiCetakTagihan id={id} />
    </ButuhAkses>
  )
}
