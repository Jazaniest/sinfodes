import { Button } from 'react-aria-components'
import { teksPerkiraan, type JenisSuratWarga } from '@/domain/warga/ajukan'
import { namaJenisLengkap } from '@/domain/warga/permohonan'
import { cn } from '@/ui/cn'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

type Props = { jenis: readonly JenisSuratWarga[]; dipilihId: string | null; onPilih: (jenis: JenisSuratWarga) => void }

/** Langkah 1: jenis surat yang boleh diajukan online, beserta syarat dan perkiraan waktunya (SPEC §10). */
export function LangkahJenis({ jenis, dipilihId, onPilih }: Props) {
  if (jenis.length === 0) {
    return <EmptyState judul="Belum ada surat yang bisa diajukan online" keterangan="Datang ke kantor desa untuk mengurus surat." />
  }
  return (
    <ul className="flex flex-col gap-3">
      {jenis.map((j) => (
        <li key={j.id}>
          <Button
            onPress={() => onPilih(j)}
            className={cn(
              'flex w-full flex-col items-start gap-1 rounded-1 border bg-lembar px-4 py-3 text-left',
              'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru data-[pressed]:bg-kertas-2',
              j.id === dipilihId ? 'border-biru' : 'border-garis',
            )}
          >
            <span className="font-medium">{namaJenisLengkap(j)}</span>
            <span className="text-teks-kecil text-tinta-2">Syarat: {j.syarat.join(', ')}</span>
            <span className="text-teks-kecil text-tinta-2">{teksPerkiraan(j.perkiraanHariKerja)}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}
