import { ButuhAkses } from '../admin/ButuhAkses'
import { Langganan } from './Langganan'

/** Kepala Desa, Sekretaris Desa, dan Kaur Keuangan membuka Langganan (SPEC-V0.2 §10). */
export function HalamanLangganan() {
  return (
    <ButuhAkses kemampuan="langganan.lihat">
      <Langganan />
    </ButuhAkses>
  )
}
