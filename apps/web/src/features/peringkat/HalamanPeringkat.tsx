import { getRouteApi } from '@tanstack/react-router'
import { Peringkat } from './Peringkat'

const rute = getRouteApi('/admin/_panel/peringkat')

export function HalamanPeringkat() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return <Peringkat filter={filter} onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })} />
}
