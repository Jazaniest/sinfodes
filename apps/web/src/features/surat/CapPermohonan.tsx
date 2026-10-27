import type { Permohonan } from '@/domain/surat/permohonan'
import { Cap } from '@/ui/cap/Cap'

type Keadaan = Pick<Permohonan, 'status' | 'tahap'> & { dikembalikan: boolean }

/** Cap status permohonan (SPEC §4.4), ditambah keterangan: dikembalikan, atau tahap paraf/tanda tangan. */
export function CapPermohonan({ p }: { p: Keadaan }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <Cap varian={p.status} />
      {p.dikembalikan && <span className="text-teks-kecil font-medium text-oker">dikembalikan</span>}
      {p.status === 'perlu-ttd' && (
        <span className="text-teks-kecil text-tinta-2">{p.tahap === 'paraf' ? 'tahap paraf' : 'tahap tanda tangan'}</span>
      )}
    </span>
  )
}
