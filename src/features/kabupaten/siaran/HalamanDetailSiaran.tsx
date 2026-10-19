import { getRouteApi } from '@tanstack/react-router'
import { DetailSiaran } from './DetailSiaran'

const rute = getRouteApi('/kabupaten/admin/_dasbor/siaran/$siaranId')

export function HalamanDetailSiaran() {
  const { siaranId } = rute.useParams()
  return <DetailSiaran id={siaranId} />
}
