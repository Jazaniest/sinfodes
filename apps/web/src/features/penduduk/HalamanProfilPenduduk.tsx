import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { ProfilPenduduk } from './ProfilPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/penduduk/$id')

export function HalamanProfilPenduduk() {
  const { id } = rute.useParams()
  const { surat } = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <ProfilPenduduk key={id} id={id} tawaran={surat} onTutupTawaran={() => void navigate({ search: {}, replace: true })} />
    </ButuhAkses>
  )
}
