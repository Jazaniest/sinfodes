import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../../admin/ButuhAkses'
import { DaftarSuratKeluar } from './DaftarSuratKeluar'

const rute = getRouteApi('/admin/_panel/surat/arsip/')

export function HalamanSuratKeluar() {
  const filter = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="surat.lihat">
      <DaftarSuratKeluar
        filter={filter}
        onUbahFilter={(ubah) => void navigate({ search: (lama) => ({ ...lama, ...ubah }) })}
        onBuka={(id) => void navigate({ to: '/admin/surat/$id', params: { id } })}
      />
    </ButuhAkses>
  )
}
