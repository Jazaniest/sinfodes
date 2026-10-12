import { getRouteApi } from '@tanstack/react-router'
import { DaftarKegiatan } from './DaftarKegiatan'

const rute = getRouteApi('/admin/_panel/pembangunan/')

/** Pembangunan terbuka untuk semua peran (SPEC §5.1), jadi tanpa ButuhAkses. */
export function HalamanDaftarKegiatan() {
  const navigate = rute.useNavigate()
  return <DaftarKegiatan onBuka={(id) => void navigate({ to: '/admin/pembangunan/$id', params: { id } })} />
}
