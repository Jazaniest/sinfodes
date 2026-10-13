import { getRouteApi } from '@tanstack/react-router'
import { PemantauanWilayah } from './PemantauanWilayah'

const rute = getRouteApi('/konsol/_konsol/pemantauan')

export function HalamanPemantauan() {
  const { wilayah } = rute.useSearch()
  const navigate = rute.useNavigate()
  return <PemantauanWilayah wilayah={wilayah ?? null} onUbahWilayah={(kode) => void navigate({ search: { wilayah: kode } })} />
}
