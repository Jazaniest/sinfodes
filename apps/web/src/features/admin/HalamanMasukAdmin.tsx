import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { opsiAlamat } from '@/api/alamat'
import { simpanSesi } from '@/app/sesi'
import { HalamanMasuk } from './HalamanMasuk'

const rute = getRouteApi('/admin/masuk')

/** Pembungkus rute: simpan sesi, bersihkan cache, lalu kembali ke halaman yang dituju. */
export function HalamanMasukAdmin() {
  const { ke } = rute.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const alamat = useQuery(opsiAlamat())
  return (
    <HalamanMasuk
      desa={alamat.data?.jenis === 'desa' ? alamat.data.desa : null}
      modeDemo={import.meta.env.VITE_DEMO === 'true'}
      onBerhasil={(token) => {
        simpanSesi(token)
        queryClient.clear()
        void router.navigate({ href: ke ?? '/admin' })
      }}
    />
  )
}
