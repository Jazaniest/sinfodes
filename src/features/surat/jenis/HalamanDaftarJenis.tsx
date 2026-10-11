import { ButuhAkses } from '../../admin/ButuhAkses'
import { DaftarJenisSurat } from './DaftarJenisSurat'

export function HalamanDaftarJenis() {
  return (
    <ButuhAkses kemampuan="surat.lihat">
      <DaftarJenisSurat />
    </ButuhAkses>
  )
}
