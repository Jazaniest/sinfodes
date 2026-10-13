import { getRouteApi } from '@tanstack/react-router'
import { DaftarKabar } from './DaftarKabar'

const rute = getRouteApi('/desa/$slug/kabar/')

/** Pembungkus rute: `?kategori=` memilih kategori kabar. */
export function HalamanKabar() {
  const { kategori } = rute.useSearch()
  return <DaftarKabar kategori={kategori ?? null} />
}
