import { Check } from '@phosphor-icons/react'
import { cn } from '../cn'

export type LangkahStepper = { id: string; label: string }

/** Penunjuk posisi dalam alur bertahap (SPEC §4.4), mis. impor Excel. Bukan navigasi: langkah tidak bisa diklik. */
export function Stepper({ label, langkah, aktif }: { label: string; langkah: readonly LangkahStepper[]; aktif: string }) {
  const posisi = langkah.findIndex((l) => l.id === aktif)
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-x-2 gap-y-2 text-teks-kecil">
      {langkah.map((l, n) => {
        const status = n < posisi ? 'selesai' : n === posisi ? 'aktif' : 'nanti'
        return (
          <li key={l.id} aria-current={status === 'aktif' ? 'step' : undefined} className="flex items-center gap-2">
            {n > 0 && <span aria-hidden className="h-px w-6 bg-garis" />}
            <span
              aria-hidden
              className={cn(
                'flex size-6 items-center justify-center rounded-full border font-mono',
                status === 'aktif' && 'border-biru bg-biru text-putih',
                status === 'selesai' && 'border-biru text-biru',
                status === 'nanti' && 'border-garis text-tinta-3',
              )}
            >
              {status === 'selesai' ? <Check size={12} weight="bold" /> : n + 1}
            </span>
            <span className={status === 'aktif' ? 'font-medium text-tinta' : 'text-tinta-2'}>
              {l.label}
              {status === 'selesai' && <span className="sr-only"> (selesai)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
