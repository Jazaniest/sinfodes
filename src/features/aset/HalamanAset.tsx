import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarAset } from './DaftarAset'

const rute = getRouteApi('/admin/_panel/aset')

export function HalamanAset() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="aset.lihat">
      <DaftarAset filter={filter} onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })} />
    </ButuhAkses>
  )
}
