import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DetailProgram } from './DetailProgram'

const rute = getRouteApi('/admin/_panel/bansos/$id')

export function HalamanDetailProgram() {
  const { id } = rute.useParams()
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="bansos.lihat">
      <DetailProgram
        key={id}
        id={id}
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBukaPenduduk={(pendudukId) => void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id: pendudukId } })}
      />
    </ButuhAkses>
  )
}
