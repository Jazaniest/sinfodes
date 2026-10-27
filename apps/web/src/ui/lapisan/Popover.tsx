import type { ReactNode } from 'react'
import { Dialog, DialogTrigger, Popover } from 'react-aria-components'
import { cn } from '../cn'
import { Tombol, type UkuranTombol, type VarianTombol } from '../tombol/Tombol'

type Props = {
  label: ReactNode
  /** Nama aksesibel panel. */
  judul: string
  ikon?: ReactNode
  varian?: VarianTombol
  ukuran?: UkuranTombol
  lebar?: string
  children: ReactNode | ((tutup: () => void) => ReactNode)
}

/** Tombol yang membuka panel kecil, mis. "Atur kolom" dan "Filter lainnya". */
export function PopoverTombol({ label, judul, ikon, varian = 'sekunder', ukuran = 'biasa', lebar = 'w-72', children }: Props) {
  return (
    <DialogTrigger>
      <Tombol varian={varian} ukuran={ukuran} ikon={ikon}>
        {label}
      </Tombol>
      <Popover
        placement="bottom end"
        offset={6}
        className={cn(
          lebar,
          'max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2 border border-garis bg-lembar p-4 shadow-melayang outline-none data-[entering]:animate-muncul',
        )}
      >
        <Dialog aria-label={judul} className="outline-none">
          {({ close }) => (typeof children === 'function' ? children(close) : children)}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
