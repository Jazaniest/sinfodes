import { ButuhAkses } from '../admin/ButuhAkses'
import { Keuangan } from './Keuangan'

export function HalamanKeuangan() {
  return (
    <ButuhAkses kemampuan="keuangan.lihat">
      <Keuangan />
    </ButuhAkses>
  )
}
