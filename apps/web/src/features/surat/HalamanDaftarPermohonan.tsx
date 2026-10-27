import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarPermohonan } from './DaftarPermohonan'

const rute = getRouteApi('/admin/_panel/surat/')

export function HalamanDaftarPermohonan() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="surat.lihat">
      <DaftarPermohonan
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBuka={(id) => void navigate({ to: '/admin/surat/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
