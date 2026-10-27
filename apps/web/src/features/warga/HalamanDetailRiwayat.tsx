import { getRouteApi } from '@tanstack/react-router'
import { DetailRiwayat } from './DetailRiwayat'

const rute = getRouteApi('/warga/_app/riwayat/$id')

export function HalamanDetailRiwayat() {
  const { id } = rute.useParams()
  return <DetailRiwayat key={id} id={id} />
}
