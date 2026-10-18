import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { opsiAlamat } from '@/api/alamat'
import { MasukKabupaten } from './MasukKabupaten'

const rute = getRouteApi('/kabupaten/admin/masuk')

/** Pembungkus rute: kabupaten dari alamat, lalu kembali ke halaman yang dituju sesudah masuk. */
export function HalamanMasukKabupaten() {
  const { ke } = rute.useSearch()
  const router = useRouter()
  const alamat = useQuery(opsiAlamat())
  return (
    <MasukKabupaten
      kabupaten={alamat.data?.jenis === 'kabupaten' ? alamat.data.kabupaten : null}
      onBerhasil={() => void router.navigate({ href: ke ?? '/kabupaten/admin' })}
    />
  )
}
