import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarKeluarga } from './DaftarKeluarga'

const rute = getRouteApi('/admin/_panel/kependudukan/keluarga/')

export function HalamanDaftarKeluarga() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <DaftarKeluarga
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBukaKeluarga={(id) => void navigate({ to: '/admin/kependudukan/keluarga/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
