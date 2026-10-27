import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarMutasi } from './DaftarMutasi'

const rute = getRouteApi('/admin/_panel/kependudukan/mutasi/')

export function HalamanDaftarMutasi() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <DaftarMutasi
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBukaPenduduk={(id) => void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
