import { getRouteApi } from '@tanstack/react-router'
import { DetailPengaduan } from './DetailPengaduan'

const rute = getRouteApi('/warga/_app/pengaduan/$id')

export function HalamanDetailPengaduan() {
  const { id } = rute.useParams()
  return <DetailPengaduan key={id} id={id} />
}
