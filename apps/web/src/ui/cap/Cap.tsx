import { cn } from '../cn'
import { LABEL_CAP, WARNA_CAP, type VarianCap } from './varian'

/** Status berbentuk cap stempel: teks KAPITAL bergaris tepi, tidak pernah hanya warna (SPEC §4.4). */
export function Cap({ varian, label, className }: { varian: VarianCap; label?: string; className?: string }) {
  return (
    <span
      data-varian={varian}
      className={cn(
        'inline-block rounded-1 border-[1.25px] border-current px-1.5 pt-[3px] pb-[2px] text-label leading-none font-semibold whitespace-nowrap uppercase',
        WARNA_CAP[varian],
        className,
      )}
    >
      {label ?? LABEL_CAP[varian]}
    </span>
  )
}
