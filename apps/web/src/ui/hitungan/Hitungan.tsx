import { formatAngka } from '@/domain/format/angka'
import { cn } from '../cn'

export function Hitungan({ nilai, label, className }: { nilai: number; label?: string; className?: string }) {
  return (
    <span className={cn('font-mono text-teks-kecil font-medium tabular-nums', className)}>
      {formatAngka(nilai)}
      {label && <span className="sr-only"> {label}</span>}
    </span>
  )
}
