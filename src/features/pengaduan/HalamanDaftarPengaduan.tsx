import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarPengaduan } from './DaftarPengaduan'

const rute = getRouteApi('/admin/_panel/pengaduan/')

export function HalamanDaftarPengaduan() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="pengaduan.lihat">
      <DaftarPengaduan
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBuka={(id) => void navigate({ to: '/admin/pengaduan/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
