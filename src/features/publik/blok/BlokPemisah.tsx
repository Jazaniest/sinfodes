import type { BlokTampil } from '@/domain/publik/schema'
import { PitaMotif } from '@/ui/website/Nameplate'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'pemisah' }> }

/** Pemisah antarbagian halaman (SPEC-V0.2 11.4): pita motif daerah, atau garis tipis. */
export function BlokPemisah({ blok }: Props) {
  return (
    <WadahBlok blok={blok}>
      {blok.varian === 'motif' ? <PitaMotif motif={blok.data.motif} tipis /> : <hr className="border-0 border-t border-garis" />}
    </WadahBlok>
  )
}
