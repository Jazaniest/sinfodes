import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { ProfilPenduduk } from './ProfilPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/penduduk/$id')

export function HalamanProfilPenduduk() {
  const { id } = rute.useParams()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <ProfilPenduduk key={id} id={id} />
    </ButuhAkses>
  )
}
