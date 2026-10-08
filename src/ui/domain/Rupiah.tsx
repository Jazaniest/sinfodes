import { formatRupiah, formatRupiahRingkas } from '@/domain/format/angka'
import { cn } from '../cn'

/** Rupiah rata angka; bentuk ringkas menampilkan nilai lengkap di tooltip (SPEC §4.5). */
export function Rupiah({ nilai, ringkas = false, className }: { nilai: number; ringkas?: boolean; className?: string }) {
  const lengkap = formatRupiah(nilai)
  return (
    <span title={ringkas ? lengkap : undefined} className={cn('tabular-nums', className)}>
      {ringkas ? formatRupiahRingkas(nilai) : lengkap}
    </span>
  )
}
