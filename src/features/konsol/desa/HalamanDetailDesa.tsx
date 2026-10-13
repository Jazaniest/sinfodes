import { getRouteApi } from '@tanstack/react-router'
import { KhususTim } from '../KhususTim'
import { DetailDesa } from './DetailDesa'

const rute = getRouteApi('/konsol/_konsol/desa/$id')

export function HalamanDetailDesa() {
  const { id } = rute.useParams()
  const { tab = 'ringkasan' } = rute.useSearch()
  return (
    <KhususTim>
      <DetailDesa id={id} tab={tab} />
    </KhususTim>
  )
}
