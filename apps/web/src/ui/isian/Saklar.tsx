import type { ReactNode } from 'react'
import { Switch, type SwitchProps } from 'react-aria-components'
import { cn } from '../cn'

type Props = Omit<SwitchProps, 'children' | 'className'> & {
  children: ReactNode
  /** Nama tetap terbaca pembaca layar, mis. di baris tabel yang kolomnya sudah berjudul. */
  labelTersembunyi?: boolean
  className?: string
}

/**
 * Saklar yang langsung berlaku tanpa tombol simpan, mis. jenis surat aktif atau layanan online (SPEC §7.4 layar 6).
 * Di formulir yang disimpan sekaligus, pakai Checkbox.
 */
export function Saklar({ children, labelTersembunyi, className, ...rest }: Props) {
  return (
    <Switch
      {...rest}
      className={cn('group inline-flex cursor-default items-center gap-2 text-teks outline-none data-disabled:opacity-60', className)}
    >
      <span
        aria-hidden
        className="flex h-5 w-9 shrink-0 items-center rounded-full border border-garis-input bg-kertas-2 px-0.5 transition-colors group-data-selected:border-biru group-data-selected:bg-biru group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-solid group-data-focus-visible:outline-biru"
      >
        <span className="size-3.5 rounded-full bg-tinta-2 transition-transform group-data-selected:translate-x-4 group-data-selected:bg-putih" />
      </span>
      <span className={labelTersembunyi ? 'sr-only' : undefined}>{children}</span>
    </Switch>
  )
}
