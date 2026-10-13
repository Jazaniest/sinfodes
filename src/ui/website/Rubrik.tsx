import type { ReactNode } from 'react'
import { cn } from '../cn'

type Props = { id: string; judul: string; aksi?: ReactNode; className?: string; children: ReactNode }

/** Rubrik warta desa (SPEC §9): judul kapital kecil di bawah garis tebal, seperti kolom koran. `id` menjadi jangkar (#id). */
export function Rubrik({ id, judul, aksi, className, children }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className={cn('flex scroll-mt-4 flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-3 border-t-2 border-tinta pt-2">
        <h2 id={`${id}-judul`} className="text-label font-semibold tracking-wide uppercase">
          {judul}
        </h2>
        {aksi}
      </div>
      {children}
    </section>
  )
}
