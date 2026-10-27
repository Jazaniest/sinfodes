import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-aria-components'
import { cn } from '../cn'
import { kelasTombol, type UkuranTombol, type VarianTombol } from './gaya-tombol'

type Props = Omit<LinkProps, 'className' | 'children'> & {
  varian?: VarianTombol
  ukuran?: UkuranTombol
  ikon?: ReactNode
  className?: string
  children: ReactNode
}

/** Tautan yang tampil seperti tombol, untuk aksi yang membuka halaman lain (mis. *Tambah penduduk*). */
export function TautanTombol({ varian = 'sekunder', ukuran = 'biasa', ikon, className, children, ...rest }: Props) {
  return (
    <Link {...rest} className={cn(kelasTombol(varian, ukuran), className)}>
      {ikon}
      {children}
    </Link>
  )
}
