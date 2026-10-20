import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiSitus } from '@/api/website'
import { TabNav } from '@/ui/navigasi/TabNav'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaWebsite } from '../TabWebsite'
import { FormDasar } from './FormDasar'

type Props = { onKotor?: (kotor: boolean) => void; sekarang?: Date }

/**
 * Website Desa › Tampilan (SPEC-V0.2 §11.1). Sub-tab Dasar saja; Susunan (7F) dan Kode (7G) ditambahkan di tahap masing-masing
 * dan belum tampil.
 */
export function TabTampilan({ onKotor, sekarang }: Props) {
  const kueri = useQuery(opsiSitus())
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="tampilan" />
      <TabNav label="Bagian tampilan" items={[{ label: 'Dasar', href: '/admin/website/tampilan', aktif: true }]} />
      {kueri.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat tampilan website…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <FormDasar data={kueri.data.terbit.tema} onKotor={onKotor} sekarang={sekarang} />
      )}
    </div>
  )
}
