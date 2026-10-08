import { Link, type LinkProps } from 'react-aria-components'
import { cn } from '../cn'

/**
 * biru: tautan biasa. tinta: tautan di dalam daftar (selalu bergaris bawah, jadi bukan hanya warna).
 * redup: jejak halaman. Warna tidak boleh ditimpa lewat className, karena `cn` tidak menyelesaikan bentrokan kelas.
 */
const NADA = {
  biru: 'text-biru hover:underline',
  tinta: 'text-tinta underline decoration-garis-input hover:decoration-biru',
  redup: 'text-tinta-2 hover:text-tinta hover:underline',
} as const

type Props = Omit<LinkProps, 'className'> & { className?: string; nada?: keyof typeof NADA }

/** Tautan dalam teks. Navigasi diteruskan ke router lewat RouterProvider React Aria. */
export function Tautan({ className, nada = 'biru', ...rest }: Props) {
  return (
    <Link
      {...rest}
      className={cn(
        'underline-offset-4 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru',
        NADA[nada],
        className,
      )}
    />
  )
}
