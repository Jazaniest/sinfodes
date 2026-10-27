import { getRouteApi } from '@tanstack/react-router'
import { TulisSiaran } from './TulisSiaran'

const rute = getRouteApi('/kabupaten/admin/_dasbor/siaran/tulis')

export function HalamanTulisSiaran() {
  const navigate = rute.useNavigate()
  return (
    <TulisSiaran
      onTerkirim={(id) => void navigate({ to: '/kabupaten/admin/siaran/$siaranId', params: { siaranId: id } })}
      onBatal={() => void navigate({ to: '/kabupaten/admin/siaran' })}
    />
  )
}
