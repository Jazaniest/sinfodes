import { ButuhAkses } from '../admin/ButuhAkses'
import { Modul } from './Modul'

export function HalamanModul() {
  return (
    <ButuhAkses kemampuan="modul.kelola">
      <Modul />
    </ButuhAkses>
  )
}
