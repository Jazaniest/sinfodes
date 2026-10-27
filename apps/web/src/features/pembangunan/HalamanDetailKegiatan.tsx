import { getRouteApi } from '@tanstack/react-router'
import { DetailKegiatan } from './DetailKegiatan'

const rute = getRouteApi('/admin/_panel/pembangunan/$id')

export function HalamanDetailKegiatan() {
  const { id } = rute.useParams()
  return <DetailKegiatan key={id} id={id} />
}
