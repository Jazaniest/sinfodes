import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { Kesehatan } from './Kesehatan'

const rute = getRouteApi('/admin/_panel/kesehatan')

export function HalamanKesehatan() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="kesehatan.lihat">
      <Kesehatan filter={filter} onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })} />
    </ButuhAkses>
  )
}
