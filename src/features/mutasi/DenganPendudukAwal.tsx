import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiPenduduk } from '@/api/penduduk'
import type { Penduduk } from '@/domain/penduduk/schema'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

/** Memuat penduduk dari `?penduduk=` (mis. dari menu *Catat mutasi* di profil) sebelum formulir alur dipasang. */
export function DenganPendudukAwal({ id, children }: { id: string | undefined; children: (p: Penduduk | null) => ReactNode }) {
  const kueri = useQuery({ ...opsiPenduduk(id ?? ''), enabled: id !== undefined })
  if (id === undefined) return children(null)
  if (kueri.isPending) return <BarisKerangka jumlah={4} label="Memuat data penduduk…" />
  if (kueri.isError) return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  return children(kueri.data)
}
