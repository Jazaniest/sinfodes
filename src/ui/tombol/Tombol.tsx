import type { ReactNode } from 'react'
import { Button, type ButtonProps } from 'react-aria-components'
import { cn } from '../cn'
import { kelasTombol, type UkuranTombol, type VarianTombol } from './gaya-tombol'

export type { UkuranTombol, VarianTombol } from './gaya-tombol'

type Props = Omit<ButtonProps, 'className' | 'children' | 'isPending'> & {
  varian?: VarianTombol
  ukuran?: UkuranTombol
  memuat?: boolean
  ikon?: ReactNode
  className?: string
  children: ReactNode
}

export function Tombol({ varian = 'sekunder', ukuran = 'biasa', memuat = false, ikon, className, children, ...rest }: Props) {
  return (
    <Button {...rest} isPending={memuat} className={cn(kelasTombol(varian, ukuran), className)}>
      {memuat ? (
        <span aria-hidden className="size-3.5 animate-spin rounded-penuh border-2 border-current border-r-transparent" />
      ) : (
        ikon
      )}
      {children}
    </Button>
  )
}
