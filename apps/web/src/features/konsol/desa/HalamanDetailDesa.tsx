import { getRouteApi } from '@tanstack/react-router'
import { DetailDesa } from './DetailDesa'

const rute = getRouteApi('/konsol/_konsol/desa/$id')

export function HalamanDetailDesa() {
  const { id } = rute.useParams()
  const { tab = 'ringkasan' } = rute.useSearch()
  return (
    <DetailDesa id={id} tab={tab} />
  )
}
