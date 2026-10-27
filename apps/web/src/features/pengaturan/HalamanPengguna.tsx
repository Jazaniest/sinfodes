import { ButuhAkses } from '../admin/ButuhAkses'
import { PenggunaDesa } from './PenggunaDesa'

/** Hanya Sekretaris Desa yang mengelola pengguna (SPEC §5.1). */
export function HalamanPengguna() {
  return (
    <ButuhAkses kemampuan="pengguna.kelola">
      <PenggunaDesa />
    </ButuhAkses>
  )
}
