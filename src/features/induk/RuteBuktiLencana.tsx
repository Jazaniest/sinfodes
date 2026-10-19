import { getRouteApi } from '@tanstack/react-router'
import { HalamanBuktiLencana } from './HalamanBuktiLencana'

const rute = getRouteApi('/lencana/$kode')

export function RuteBuktiLencana() {
  const { kode } = rute.useParams()
  return <HalamanBuktiLencana kode={kode} />
}
