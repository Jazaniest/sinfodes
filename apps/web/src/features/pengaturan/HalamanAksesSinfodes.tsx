import { ButuhAkses } from '../admin/ButuhAkses'
import { AksesSinfodes } from './AksesSinfodes'

/** Hanya Sekretaris dan Kepala Desa yang memberi akses bantuan Sinfodes (SPEC-V0.2 §5.3). */
export function HalamanAksesSinfodes() {
  return (
    <ButuhAkses kemampuan="akses-sinfodes.kelola">
      <AksesSinfodes />
    </ButuhAkses>
  )
}
