import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { DaftarKabupaten } from './DaftarKabupaten'
import { DetailKabupaten } from './DetailKabupaten'
import { TambahKabupaten } from './TambahKabupaten'

/** Pembungkus rute Konsol › Kabupaten (SPEC-V0.2 §7). */
export function HalamanDaftarKabupaten() {
  const navigate = useNavigate()
  return <DaftarKabupaten onBuka={(kode) => void navigate({ to: '/konsol/kabupaten/$kode', params: { kode } })} />
}

export function HalamanTambahKabupaten() {
  const navigate = useNavigate()
  return (
    <TambahKabupaten
      onSelesai={(kode) => void navigate({ to: '/konsol/kabupaten/$kode', params: { kode } })}
      onBatal={() => void navigate({ to: '/konsol/kabupaten' })}
    />
  )
}

const ruteDetail = getRouteApi('/konsol/_konsol/kabupaten/$kode')

export function HalamanDetailKabupaten() {
  const { kode } = ruteDetail.useParams()
  return <DetailKabupaten kode={kode} />
}
