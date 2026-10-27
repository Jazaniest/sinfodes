import { CheckCircle, Info, Warning, WarningOctagon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '../cn'

export type NadaBanner = 'info' | 'peringatan' | 'galat' | 'berhasil'

const GAYA: Record<NadaBanner, string> = {
  info: 'border-biru bg-biru-muda',
  peringatan: 'border-oker bg-oker-muda',
  galat: 'border-merah bg-merah-muda',
  berhasil: 'border-hijau bg-hijau-muda',
}
const IKON: Record<NadaBanner, ReactNode> = {
  info: <Info size={18} className="text-biru" />,
  peringatan: <Warning size={18} className="text-oker" />,
  galat: <WarningOctagon size={18} className="text-merah" />,
  berhasil: <CheckCircle size={18} className="text-hijau" />,
}

export function Banner({
  nada = 'info',
  judul,
  children,
  aksi,
}: {
  nada?: NadaBanner
  judul?: string
  children: ReactNode
  aksi?: ReactNode
}) {
  // Wadah sempit (HP warga): aksi turun ke bawah teks supaya judul tidak terjepit; wadah lebar: aksi di samping.
  return (
    <div role={nada === 'galat' ? 'alert' : 'status'} className={cn('@container flex gap-3 rounded-1 border-l-4 px-4 py-3', GAYA[nada])}>
      <span aria-hidden className="mt-0.5 shrink-0">
        {IKON[nada]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 @md:flex-row @md:items-center @md:gap-3">
        <div className="min-w-0 flex-1 self-stretch">
          {judul && <p className="font-medium">{judul}</p>}
          <div>{children}</div>
        </div>
        {aksi && <div className="shrink-0">{aksi}</div>}
      </div>
    </div>
  )
}
