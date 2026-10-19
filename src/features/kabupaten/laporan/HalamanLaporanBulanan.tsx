import { getRouteApi } from '@tanstack/react-router'
import { LaporanBulanan } from './LaporanBulanan'

const rute = getRouteApi('/kabupaten/admin/_dasbor/laporan/$bulan')

export function HalamanLaporanBulanan() {
  const { bulan } = rute.useParams()
  return <LaporanBulanan bulan={bulan} />
}
