import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarProgram } from './DaftarProgram'

const rute = getRouteApi('/admin/_panel/bansos/')

export function HalamanDaftarProgram() {
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="bansos.lihat">
      <DaftarProgram onBuka={(id) => void navigate({ to: '/admin/bansos/$id', params: { id } })} />
    </ButuhAkses>
  )
}
