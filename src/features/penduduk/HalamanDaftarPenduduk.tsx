import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarPenduduk } from './DaftarPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/penduduk/')

/** Pembungkus rute: filter dari/ke URL, buka profil lewat router. */
export function HalamanDaftarPenduduk() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <DaftarPenduduk
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBukaProfil={(id) => void navigate({ to: '/admin/kependudukan/penduduk/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
