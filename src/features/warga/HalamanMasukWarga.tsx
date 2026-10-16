import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { opsiAlamat } from '@/api/alamat'
import { FormMasukWarga } from './FormMasukWarga'
import { pasangSesiWarga } from './masuk-warga'

const rute = getRouteApi('/warga/masuk')

/** Pembungkus rute: pasang sesi warga, lalu kembali ke halaman yang dituju. */
export function HalamanMasukWarga() {
  const { ke } = rute.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const alamat = useQuery(opsiAlamat())
  return (
    <FormMasukWarga
      namaDesa={alamat.data?.jenis === 'desa' ? alamat.data.desa.nama : null}
      modeDemo={import.meta.env.VITE_DEMO === 'true'}
      onBerhasil={(token, sesi) => {
        pasangSesiWarga(token, sesi, queryClient)
        void router.navigate({ href: ke ?? '/warga' })
      }}
    />
  )
}
