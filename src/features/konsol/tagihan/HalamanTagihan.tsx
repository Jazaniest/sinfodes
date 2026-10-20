import { getRouteApi } from '@tanstack/react-router'
import { DaftarTagihan } from './DaftarTagihan'
import { DetailTagihan } from './DetailTagihan'

const ruteDaftar = getRouteApi('/konsol/_konsol/tagihan/')
const ruteDetail = getRouteApi('/konsol/_konsol/tagihan/$id')

/** Daftar Tagihan; tab di alamat halaman, dan `key` mengembalikan nomor halaman ke 1 saat tab berganti. */
export function HalamanDaftarTagihan() {
  const { tab } = ruteDaftar.useSearch()
  const navigate = ruteDaftar.useNavigate()
  return <DaftarTagihan key={tab ?? 'bawaan'} tab={tab} onBukaTagihan={(id) => void navigate({ to: '/konsol/tagihan/$id', params: { id } })} />
}

export function HalamanDetailTagihan() {
  const { id } = ruteDetail.useParams()
  return <DetailTagihan id={id} />
}
