import { getRouteApi } from '@tanstack/react-router'
import { KhususTim } from '../KhususTim'
import { DaftarDesa } from './DaftarDesa'

const rute = getRouteApi('/konsol/_konsol/desa/')

export function HalamanDaftarDesa() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <KhususTim>
      <DaftarDesa
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBukaDesa={(id) => void navigate({ to: '/konsol/desa/$id', params: { id } })}
      />
    </KhususTim>
  )
}
