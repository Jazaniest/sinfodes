import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DetailKeluarga } from './DetailKeluarga'

const rute = getRouteApi('/admin/_panel/kependudukan/keluarga/$id')

export function HalamanDetailKeluarga() {
  const { id } = rute.useParams()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <DetailKeluarga
        key={id}
        id={id}
        onBukaPenduduk={(idPenduduk) => void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id: idPenduduk } })}
      />
    </ButuhAkses>
  )
}
