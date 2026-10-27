import { ButuhAkses } from '../admin/ButuhAkses'
import { TumpukanTandaTangan } from './TumpukanTandaTangan'

export function HalamanTandaTangan() {
  return (
    <ButuhAkses kemampuan="surat.tandatangani">
      <TumpukanTandaTangan />
    </ButuhAkses>
  )
}
