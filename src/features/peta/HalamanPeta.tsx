import { getRouteApi } from '@tanstack/react-router'
import { Peta } from './Peta'

const rute = getRouteApi('/admin/_panel/peta')

/** Peta Desa terbuka untuk semua peran (SPEC §5.1). */
export function HalamanPeta() {
  const { kegiatan } = rute.useSearch()
  return <Peta key={kegiatan ?? ''} kegiatanAwal={kegiatan} />
}
