import { getRouteApi } from '@tanstack/react-router'
import { DetailTenggat } from './DetailTenggat'

const rute = getRouteApi('/kabupaten/admin/_dasbor/dana-desa/tenggat/$tenggatId')

export function HalamanDetailTenggat() {
  const { tenggatId } = rute.useParams()
  const navigate = rute.useNavigate()
  return <DetailTenggat id={tenggatId} onDihapus={() => void navigate({ to: '/kabupaten/admin/dana-desa' })} />
}
