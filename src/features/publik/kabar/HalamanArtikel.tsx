import { getRouteApi } from '@tanstack/react-router'
import { ArtikelPublik } from './ArtikelPublik'

const rute = getRouteApi('/desa/$slug/kabar/$artikel')

export function HalamanArtikel() {
  const { artikel } = rute.useParams()
  return <ArtikelPublik artikel={artikel} />
}
