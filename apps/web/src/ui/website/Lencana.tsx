import { LABEL_KATEGORI_DESA } from '@/domain/indeks/kategori'
import type { LencanaPublik } from '@/domain/indeks/lencana'
import { cn } from '../cn'

type Props = {
  lencana: LencanaPublik
  /** Alamat halaman bukti; lencana selalu bisa dibuka di sana. */
  href: string
  /** Di website desa memakai warna aksen desa; di halaman bukti memakai warna stempel Register. */
  varian: 'website' | 'bukti'
  /** Ukuran kecil untuk baris daftar pengelolaan. */
  kecil?: boolean
  className?: string
}

const WARNA = { website: 'text-biru', bukti: 'text-stempel' } as const

/**
 * Cap lencana juara (rencana 7C-2 butir 13): cap arsip bergaris ganda tipis, sudut tajam, tanpa bayangan atau gradien.
 * Angka peringkat di lingkaran kecil, lalu kategori, lalu wilayah dan periode. Tautan ke halaman bukti.
 */
export function CapLencana({ lencana, href, varian, kecil = false, className }: Props) {
  const [, wilayah, periode] = lencana.kalimat.split(' · ')
  return (
    <a
      href={href}
      aria-label={`${lencana.kalimat}, buka bukti lencana`}
      data-varian={varian}
      className={cn(
        'inline-block border-[1.25px] border-current p-[3px] outline-none data-[focus-visible]:outline-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-current',
        WARNA[varian],
        className,
      )}
    >
      <span className={cn('flex items-center gap-3 border border-current', kecil ? 'px-2 py-1.5' : 'px-3 py-2.5')}>
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full border-[1.25px] border-current font-serif font-semibold tabular-nums',
            kecil ? 'size-7 text-dasar' : 'size-9 text-judul-bagian',
          )}
        >
          {lencana.peringkat}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 text-left leading-tight">
          <span className="text-label font-semibold tracking-wide uppercase">
            {LABEL_KATEGORI_DESA[lencana.kategori]}
            {lencana.bersama && <span className="font-normal normal-case">{' · bersama'}</span>}
          </span>
          <span className="text-teks-kecil text-tinta-2">{`${wilayah} · ${periode}`}</span>
        </span>
      </span>
    </a>
  )
}
