import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { StatistikPenduduk } from './StatistikPenduduk'

const rute = getRouteApi('/admin/_panel/kependudukan/statistik')

export function HalamanStatistik() {
  const { dusun } = rute.useSearch()
  const navigate = rute.useNavigate()
  return (
    <ButuhAkses kemampuan="penduduk.lihat">
      <StatistikPenduduk dusun={dusun ?? null} onUbahDusun={(d) => void navigate({ search: d === null ? {} : { dusun: d } })} />
    </ButuhAkses>
  )
}
