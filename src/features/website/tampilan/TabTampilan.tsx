import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useEffect } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiSitus } from '@/api/website'
import { TabNav } from '@/ui/navigasi/TabNav'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaWebsite } from '../TabWebsite'
import { PenyuntingSusunan } from '../susunan/PenyuntingSusunan'
import { BilahDraf } from './BilahDraf'
import { FormDasar } from './FormDasar'
import { DrafSitusKonteks, useKeadaanDrafSitus } from './useDrafSitus'

type Props = { onKotor?: (kotor: boolean) => void; sekarang?: Date }

const rute = getRouteApi('/admin/_panel/website/tampilan')

/**
 * Website Desa - Tampilan (SPEC-V0.2 11.1): sub-tab Dasar dan Susunan berbagi satu keadaan draf dengan bilah draf di atasnya.
 * Sub-tab Kode (7G) menyusul.
 */
export function TabTampilan({ onKotor, sekarang }: Props) {
  const cari = rute.useSearch()
  const kueri = useQuery(opsiSitus())
  const draf = useKeadaanDrafSitus()
  const bagian = cari.bagian === 'susunan' ? 'susunan' : 'dasar'

  useEffect(() => {
    onKotor?.(draf.status !== 'tersimpan')
  }, [draf.status, onKotor])

  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="tampilan" />
      <TabNav
        label="Bagian tampilan"
        items={[
          { label: 'Dasar', href: '/admin/website/tampilan', aktif: bagian === 'dasar' },
          { label: 'Susunan', href: '/admin/website/tampilan?bagian=susunan', aktif: bagian === 'susunan' },
        ]}
      />
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !draf.isi ? (
        <BarisKerangka jumlah={6} label="Memuat tampilan website…" />
      ) : (
        <DrafSitusKonteks.Provider value={draf}>
          <BilahDraf />
          {bagian === 'susunan' ? <PenyuntingSusunan /> : <FormDasar sekarang={sekarang} />}
        </DrafSitusKonteks.Provider>
      )}
    </div>
  )
}
