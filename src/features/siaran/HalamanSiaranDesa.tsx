import { getRouteApi } from '@tanstack/react-router'
import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarSiaranDesa } from './DaftarSiaranDesa'
import { DetailSiaranDesa } from './DetailSiaranDesa'

const ruteDetail = getRouteApi('/admin/_panel/siaran/$siaranId')

/** Siaran kabupaten di panel desa (SPEC-V0.2 §8.4): Kades, Sekdes, dan Operator. */
export function HalamanSiaranDesa() {
  return (
    <ButuhAkses kemampuan="siaran.lihat">
      <DaftarSiaranDesa />
    </ButuhAkses>
  )
}

export function HalamanDetailSiaranDesa() {
  const { siaranId } = ruteDetail.useParams()
  return (
    <ButuhAkses kemampuan="siaran.lihat">
      <DetailSiaranDesa key={siaranId} id={siaranId} />
    </ButuhAkses>
  )
}
