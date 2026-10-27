import { getRouteApi } from '@tanstack/react-router'
import { PapanIndeks } from './PapanIndeks'

const rute = getRouteApi('/kabupaten/admin/_dasbor/indeks')

export function HalamanIndeks() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return <PapanIndeks filter={filter} onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })} />
}
