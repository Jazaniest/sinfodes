import { ButuhAkses } from '../admin/ButuhAkses'
import { DaftarBuku } from './DaftarBuku'

export function HalamanDaftarBuku() {
  return (
    <ButuhAkses kemampuan="buku.lihat">
      <DaftarBuku />
    </ButuhAkses>
  )
}
