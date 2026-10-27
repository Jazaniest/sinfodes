import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../../admin/ButuhAkses'
import { DaftarSuratMasuk } from './DaftarSuratMasuk'

const rute = getRouteApi('/admin/_panel/surat/arsip/masuk')

export function HalamanSuratMasuk() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="surat.lihat">
      <DaftarSuratMasuk filter={filter} onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })} />
    </ButuhAkses>
  )
}
